import { StompConfig, StompFailMessage, StompHeaders, StompMessage, StompSendMessage } from './stomp-connector.common';

type LifecycleEvent = ua.naiksoftware.stomp.dto.LifecycleEvent;
type StompClient = ua.naiksoftware.stomp.StompClient;

export class StompConnector {
	private _callbacks: {
		topics: [{ destination: string, callback: (payload: StompMessage) => void, fail?: (error: StompFailMessage) => void }?], 
        messages: [{ destination: string, callback: () => void, fail?: (error: StompFailMessage) => void  }?]};
		
	private _mStompClient: ua.naiksoftware.stomp.StompClient;
	private _compositeDisposable: io.reactivex.disposables.CompositeDisposable;
	private _topicCompositeDisposable: io.reactivex.disposables.CompositeDisposable;
	private _messageCompositeDisposable: io.reactivex.disposables.CompositeDisposable;

	private _config: StompConfig;

	constructor() {
		this._callbacks = { topics: [], messages: [] };
	}

	connect(config: StompConfig) {
		if (!!this.mStompClient) {
			this.disconnect();
		}

		this._config = config;

		this.mStompClient = ua.naiksoftware.stomp.Stomp.over(
			ua.naiksoftware.stomp.Stomp.ConnectionProvider.OKHTTP,
			config.brokerURL
		);

		let headers = new java.util.ArrayList<ua.naiksoftware.stomp.dto.StompHeader>();
		if (!!config.connectHeaders) {
			const keys = Object.keys(config.connectHeaders);
			keys.forEach((key) => {
				headers.add(new ua.naiksoftware.stomp.dto.StompHeader(key, config.connectHeaders[key]));
			});
		}

		this.mStompClient
			.withClientHeartbeat(!!config.heartbeatIncoming ? config.heartbeatIncoming : 1000)
			.withServerHeartbeat(!!config.heartbeatOutgoing ? config.heartbeatOutgoing : 1000);

		this._resetSubscriptions();
		this._resetTopicSubscriptions();
		this._resetMessageSubscriptions();

		const that = new WeakRef(this);

		const successCB = new io.reactivex.functions.Consumer<LifecycleEvent>({
			accept: (lifecycleEvent: LifecycleEvent) => {
				that.get()._callDebug(`>>>>> LifecycleEvent: ${lifecycleEvent.getType()}`);
				switch (lifecycleEvent.getType()) {
					case ua.naiksoftware.stomp.dto.LifecycleEvent.Type.OPENED:
						config.onConnect();
						break;
					case ua.naiksoftware.stomp.dto.LifecycleEvent.Type.ERROR:
						console.error(lifecycleEvent.getException().toString());
						config.onStompError(lifecycleEvent.getException().toString());
						break;
					case ua.naiksoftware.stomp.dto.LifecycleEvent.Type.CLOSED:
						config.onDisconnect();
						this._startAutoReConnect();
						this._resetSubscriptions();
						break;
					case ua.naiksoftware.stomp.dto.LifecycleEvent.Type.FAILED_SERVER_HEARTBEAT:
						config.onFailedServerHeartBeat(lifecycleEvent.getMessage());
						break;
				}
			},
		});

		const errorCB = new io.reactivex.functions.Consumer<any>({
			accept: function (throwable: any /*Throwable*/) {
				that.get()._callDebug(`>>>>> connect error: ${JSON.stringify(throwable.getMessage())}`);
				config.onStompError(JSON.stringify(throwable));
			},
		});

		this._compositeDisposable.add(
			this.mStompClient
				.lifecycle()
				.subscribeOn(io.reactivex.schedulers.Schedulers.io())
				.observeOn(io.reactivex.android.schedulers.AndroidSchedulers.mainThread())
				.subscribe(successCB, errorCB)
		);

		this.mStompClient.connect(headers);
	}

	private _resetSubscriptions() {
		if (!!this._compositeDisposable) {
			this._compositeDisposable.dispose();
		}
		this._compositeDisposable = new io.reactivex.disposables.CompositeDisposable();
	}

	private _startAutoReConnect() {
		if(this._config.autoReconnect && !!this.mStompClient) {
			this._callDebug(`>>>>> attempt to reconnect to ws`);
			var autoReconnectInterval = setInterval(() => {
				if (!this.mStompClient.isConnected()) {
					this._callDebug(`>>>>> calling lib reconnect method`);
					this.mStompClient.reconnect();
				} else {
					this._callDebug(`>>>>> We are connected now, clearing interval | !YOU should resubscribe to your topics or queues `);
					this._config.onReconnect();
					clearInterval(autoReconnectInterval);
				}
			}, !!this._config.reconnectDelay ? this._config.reconnectDelay : 5000);
		}
	}

	public disconnect() {
        if (!!this.mStompClient) {
			this._config.autoReconnect = false;

            this.mStompClient.disconnect();
            this.mStompClient = null;
        }
	}
	
	public isConnected(): boolean {
		if (!!this.mStompClient) {
			return this.mStompClient.isConnected();
		} else {
			return false;
		}
	}

	public topic(
		destination: string,
		callback: (payload: StompMessage) => {},
		fail?: (payload: StompFailMessage) => {}
	) {
		if (!!this.mStompClient) {
			this._callbacks['topics'].push({ 
				destination: destination, 
				callback: callback, 
				fail: !!fail ? fail : (error) => { console.error(error) } });
	
			const that = new WeakRef(this);
	
			const _subscribeCallback = new io.reactivex.functions.Consumer({
				accept: function (topicMessage: ua.naiksoftware.stomp.dto.StompMessage) {
					that.get()._callDebug(`>>>>> topic message received from destination: ${destination}`);
					that.get()._notify('topics', destination, JSON.parse(topicMessage.getPayload()));
				},
			});
	
			const _subscribeCallbackError = new io.reactivex.functions.Consumer({
				accept: function (throwable: any /*Throwable*/) {
					that.get()._callDebug(`>>>>> topic message error from destination: ${destination} | error: ${JSON.stringify(throwable)}`);
					that.get()._notify('topics', destination, null, JSON.stringify(throwable));
				},
			});
	
			that.get()._callDebug(`>>>>> attempt to subscribe to topic: ${destination}`);
			this._topicCompositeDisposable.add(
				this.mStompClient
					.topic(destination)
					.subscribeOn(io.reactivex.schedulers.Schedulers.io())
					.observeOn(io.reactivex.android.schedulers.AndroidSchedulers.mainThread())
					.subscribe(_subscribeCallback, _subscribeCallbackError)
			);
		}
	}

	public unsubscribe(destination: string, callback?: () => void) {
		const that = new WeakRef(this);

		this.mStompClient.unsubscribePath(destination)
			.subscribe(new io.reactivex.functions.Action({
				run: function() {
					that.get()._callDebug(`>>>>> unsubscribePath from destination ${destination}`);
					this.callback();
				}
			}), new io.reactivex.functions.Consumer({
				accept: function (throwable: any /*Throwable*/) {
					that.get()._callDebug(`>>>>> unsubscribePath message error from destination: ${destination} | error: ${JSON.stringify(throwable)}`);
				},
			}))
	}

	private _resetTopicSubscriptions() {
		if (!!this._topicCompositeDisposable) {
			this._topicCompositeDisposable.dispose();
			this._callbacks['topics'] = [];
		}

		this._topicCompositeDisposable = new io.reactivex.disposables.CompositeDisposable();
	}

	public send(request: StompSendMessage, callback?: () => void, fail?: (payload: StompFailMessage) => {}) {
        if (!!this.mStompClient) {
			this._callDebug(`>>>>> attempt to send message to destination: ${request.destination}`);

			if (!!callback) {
				this._callbacks['messages'].push({ 
					destination: request.destination, 
					callback: callback, 
					fail: !!fail ? fail : (error) => { console.error(error) } });
			}
				
			const that = new WeakRef(this);

			const _sendMessageCallback = new io.reactivex.functions.Action({
				run: function() {
					that.get()._callDebug(`>>>>> message sent`);
					that.get()._notify('messages', request.destination);
				}
			});
	
			const _sendMessageFailCallback = new io.reactivex.functions.Consumer({
				accept: function(throwable: any /*Throwable*/) {
					that.get()._callDebug(`>>>>> message error: ${JSON.stringify(throwable)}`);
					that.get()._notify('messages', request.destination, null, throwable.getMessage());
				}
			});

			if (!!request.withHeaders) {
				const _stompSendMessage = this._buildStompSendMessageRequestObject(request);
				this.mStompClient.send(_stompSendMessage).subscribe(_sendMessageCallback, _sendMessageFailCallback);
			} else {
				this.mStompClient
					.send(request.destination, request.message)
						.subscribe(_sendMessageCallback, _sendMessageFailCallback);
			}

        }
	}
	
	private _buildStompSendMessageRequestObject(request: StompSendMessage) {
		let headers = new java.util.ArrayList<ua.naiksoftware.stomp.dto.StompHeader>();
		if (!!request.withHeaders) {
			const keys = Object.keys(request.withHeaders);
			keys.forEach((key) => {
				headers.add(new ua.naiksoftware.stomp.dto.StompHeader(key, request.withHeaders[key]));
			});

			headers.add(new ua.naiksoftware.stomp.dto.StompHeader('destination', request.destination));
		}

		return new ua.naiksoftware.stomp.dto.StompMessage('SEND', headers, request.message);
	}

	private _resetMessageSubscriptions() {
		if (!!this._messageCompositeDisposable) {
			this._messageCompositeDisposable.dispose();
			this._callbacks['messages'] = [];
		}

		this._messageCompositeDisposable = new io.reactivex.disposables.CompositeDisposable();
	}

	set mStompClient(stompClient: StompClient) {
		this._mStompClient = stompClient;
	}

	get mStompClient() {
		return this._mStompClient;
	}

	private _callDebug(msg: string) {
		if (!!this._config.debug) {
			this._config.debug(msg);
		}
	}

	private _notify(type: string, destination: string, response?: any, error?: any): void {
		var _cb = this._callbacks[type];
		if (_cb.length > 0) {
			const callBackEvent = _cb.find((cbByType) => cbByType.destination === destination);
			if (!!error) {
				callBackEvent.error({ destination: destination, error: error });
			} else {
				if (!!response) {
					callBackEvent.callback({ destination: destination, payload: response});
				} else {
					callBackEvent.callback();
				}
			}
		}
	}

	private _removeFromCallback(type: string, destination: string): void {
		var topics = this._callbacks[type];
		if (topics.length > 0) {
			const index = topics.findIndex((topic) => topic.destination === destination);
			if (index >= 0) {
				this._callbacks[type].splice(index, 1);
			}
		}
	}
}