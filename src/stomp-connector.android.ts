import { StompConfig, StompFailMessage, StompMessage, StompSendMessage } from './stomp-connector.common';

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
	
	private _listOfTopicsDisposable: Array<{ destination: string, disposable: io.reactivex.disposables.Disposable}>;
	private _subscribeCallback: io.reactivex.functions.Consumer<any>;
	private _subscribeCallbackError: io.reactivex.functions.Consumer<any>;

	private _config: StompConfig;

	constructor() {
		this._callbacks = { topics: [], messages: [] };
		this._listOfTopicsDisposable = new Array<{ destination: string, disposable: io.reactivex.disposables.Disposable}>();
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
		
		const that = new WeakRef(this);
		
		this._subscribeCallback = new io.reactivex.functions.Consumer({
			accept: function (topicMessage: ua.naiksoftware.stomp.dto.StompMessage) {
				that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] topic message received from destination: ${['destination']}`);
				that.get()._notify('topics', '/topic/broadcast', JSON.parse(topicMessage.getPayload()));
			},
		});

		this._subscribeCallbackError = new io.reactivex.functions.Consumer({
			accept: function (throwable: any /*Throwable*/) {
				that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] topic message error from destination: ${'/topic/broadcast'} | error: ${JSON.stringify(throwable)}`);
				that.get()._notify('topics', '/topic/broadcast', null, JSON.stringify(throwable));
			},
		});

		this._connect(config);
	}

	private _connect(config: StompConfig) {
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
				that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] LifecycleEvent: ${lifecycleEvent.getType()}`);
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
						break;
					case ua.naiksoftware.stomp.dto.LifecycleEvent.Type.FAILED_SERVER_HEARTBEAT:
						this._gotHeartBeatFail();
						config.onFailedServerHeartBeat(lifecycleEvent.getMessage());
						break;
				}
			},
		});

		const errorCB = new io.reactivex.functions.Consumer<any>({
			accept: function (throwable: any /*Throwable*/) {
				that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] connect error: ${JSON.stringify(throwable.getMessage())}`);
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

	private _resetTopicSubscriptions() {
		if (!!this._topicCompositeDisposable) {
			this._topicCompositeDisposable.dispose();
			this._listOfTopicsDisposable = new Array<{ destination: string, disposable: io.reactivex.disposables.Disposable}>();
			this._callbacks['topics'] = [];
		}

		this._topicCompositeDisposable = new io.reactivex.disposables.CompositeDisposable();
	}
	
	private _resetMessageSubscriptions() {
		if (!!this._messageCompositeDisposable) {
			this._messageCompositeDisposable.dispose();
			this._callbacks['messages'] = [];
		}

		this._messageCompositeDisposable = new io.reactivex.disposables.CompositeDisposable();
	}

	private _startAutoReConnect() {
		if(this._config.autoReconnect && !!this.mStompClient) {
			this._callDebug(`[STOMP_CONNECTOR_DEBUG] attempt to reconnect to ws`);
			var autoReconnectInterval = setInterval(() => {
				if (!this.mStompClient.isConnected()) {
					this._callDebug(`[STOMP_CONNECTOR_DEBUG] and now? Did we connect?`);
				} else {
					if (!!this._config.onReconnect && (typeof this._config.onReconnect === 'function')) {
						this._config.onReconnect();
					}

					clearInterval(autoReconnectInterval);
				}
			}, !!this._config.reconnectDelay ? this._config.reconnectDelay : 5000);
		}
	}

	private _gotHeartBeatFail() {
		this._callDebug(`[STOMP_CONNECTOR_DEBUG] HEART beat failed!`);
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
			if (!this._isAlreadySubscribedToTopic(destination)) {
				this._callbacks['topics'].push({ 
					destination: destination, 
					callback: callback, 
					fail: !!fail ? fail : (error) => { console.error(error) } });
		
				this._callDebug(`[STOMP_CONNECTOR_DEBUG] attempt to subscribe to topic: ${destination}`);
				const newTopiDisposable = this.mStompClient
						.topic(destination)
						.subscribeOn(io.reactivex.schedulers.Schedulers.io())
						.observeOn(io.reactivex.android.schedulers.AndroidSchedulers.mainThread())
						.subscribe(this._subscribeCallback, this._subscribeCallbackError);
	
				this._listOfTopicsDisposable.push({ destination: destination, disposable: newTopiDisposable });
				this._topicCompositeDisposable.add(newTopiDisposable);
			} else {
				this.unsubscribe(destination, () => { this.topic(destination, callback, fail) });
			}
		}
	}

	private _isAlreadySubscribedToTopic(destination: string) {
		const foundIndex = this._callbacks['topics'].findIndex((topic) => topic.destination === destination);
		this._callDebug(`[STOMP_CONNECTOR_DEBUG] is topic already subscribed for ${destination}? ${foundIndex !== -1 ? 'YES' : 'NO'}`);
		return foundIndex !== -1;
	}

	public unsubscribe(destination: string, callback?: () => void) {
		this._removeTopicFromDisposable(destination);

		const that = new WeakRef(this);
		if (!!this.mStompClient && this.mStompClient.isConnected()) {

			this.mStompClient.unsubscribePath(destination)
				.subscribe(new io.reactivex.functions.Action({
					run: function() {
						that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] unsubscribePath from destination ${destination}`);
						if (!!callback && typeof callback === 'function') {
							callback();
						}
					}
				}), new io.reactivex.functions.Consumer({
					accept: function (throwable: any /*Throwable*/) {
						that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] unsubscribePath message error from destination: ${destination} | error: ${JSON.stringify(throwable)}`);
					},
				}));
		} else {
			that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] unsubscribePath not possible because you never subscribe to ${destination}`);
			if (!!callback && typeof callback === 'function') {
				callback();
			}
		}
	}

	private _removeTopicFromDisposable(destination: string) {
		this._removeFromCallback('topics', destination);

		const index = this._listOfTopicsDisposable.findIndex((topic) => topic.destination === destination);
		if (index >= 0) {
			this._callDebug(`[STOMP_CONNECTOR_DEBUG] removed disposable `);
			this._topicCompositeDisposable.remove(this._listOfTopicsDisposable[index].disposable);
			this._listOfTopicsDisposable.splice(index, 1);
		}
	}

	public send(request: StompSendMessage, callback?: () => void, fail?: (payload: StompFailMessage) => {}) {
        if (!!this.mStompClient) {
			this._callDebug(`[STOMP_CONNECTOR_DEBUG] attempt to send message to destination: ${request.destination}`);

			if (!!callback) {
				this._callbacks['messages'].push({ 
					destination: request.destination, 
					callback: callback, 
					fail: !!fail ? fail : (error) => { console.error(error) } });
			}
				
			const that = new WeakRef(this);

			const _sendMessageCallback = new io.reactivex.functions.Action({
				run: function() {
					that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] message sent`);
					that.get()._notify('messages', request.destination);
				}
			});
	
			const _sendMessageFailCallback = new io.reactivex.functions.Consumer({
				accept: function(throwable: any /*Throwable*/) {
					that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] message error: ${JSON.stringify(throwable)}`);
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

		return new ua.naiksoftware.stomp.dto.StompMessage(ua.naiksoftware.stomp.dto.StompCommand.SEND, headers, request.message);
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
		this._callDebug(`[STOMP_CONNECTOR_DEBUG] removing ${type} with destination ${destination} from callback listener`);
		var topics = this._callbacks[type];
		if (topics.length > 0) {
			const index = topics.findIndex((topic) => topic.destination === destination);
			if (index >= 0) {
				this._callDebug(`[STOMP_CONNECTOR_DEBUG] removed from position ${index}`);
				this._callbacks[type].splice(index, 1);
			}
		}
	}
}