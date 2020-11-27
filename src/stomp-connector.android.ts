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
	
	private _listOfTopicsDisposable: Array<{ destination: string, disposable: io.reactivex.disposables.Disposable}>;

	private _config: StompConfig;

	constructor() {
		this._callbacks = { topics: [], messages: [] };
		this._listOfTopicsDisposable = new Array<{ destination: string, disposable: io.reactivex.disposables.Disposable}>();
	}

	connect(config: StompConfig) {
		this._config = config;

		this.mStompClient = ua.naiksoftware.stomp.Stomp.over(
			ua.naiksoftware.stomp.Stomp.ConnectionProvider.OKHTTP,
			config.brokerURL
		);

		this.mStompClient
			.withClientHeartbeat(!!config.heartbeatIncoming ? config.heartbeatIncoming : 1000)
			.withServerHeartbeat(!!config.heartbeatOutgoing ? config.heartbeatOutgoing : 1000);

		this._connectToStompClientLifecycle();
		this._callConnectWithHeader();
	}

	private _connectToStompClientLifecycle() {
		this._resetSubscriptions();
		this._resetTopicDisposables();

		const that = new WeakRef(this);

		this._compositeDisposable.add(
			this.mStompClient
				.lifecycle()
				.subscribeOn(io.reactivex.schedulers.Schedulers.io())
				.observeOn(io.reactivex.android.schedulers.AndroidSchedulers.mainThread())
				.subscribe(
					new io.reactivex.functions.Consumer<LifecycleEvent>({
						accept: (lifecycleEvent: LifecycleEvent) => {
							that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] LifecycleEvent: ${lifecycleEvent.getType()}`);
							switch (lifecycleEvent.getType()) {
								case ua.naiksoftware.stomp.dto.LifecycleEvent.Type.OPENED:
									that.get()._config.onConnect();
									break;
								case ua.naiksoftware.stomp.dto.LifecycleEvent.Type.ERROR:
									console.error(lifecycleEvent.getException().toString());
									that.get()._config.onStompError(lifecycleEvent.getException().toString());
									break;
								case ua.naiksoftware.stomp.dto.LifecycleEvent.Type.CLOSED:
									that.get()._config.onDisconnect();
									this._startAutoReConnect();
									break;
								case ua.naiksoftware.stomp.dto.LifecycleEvent.Type.FAILED_SERVER_HEARTBEAT:
									this._gotHeartBeatFail();
									that.get()._config.onFailedServerHeartBeat(lifecycleEvent.getMessage());
									break;
							}
						},
					}), 
					new io.reactivex.functions.Consumer<any>({
						accept: function (throwable: any /*Throwable*/) {
							that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] connect error: ${JSON.stringify(throwable.getMessage())}`);
							that.get()._config.onStompError(JSON.stringify(throwable));
						},
					})
				)
		);
	}

	private _callConnectWithHeader() {
		let headers = new java.util.ArrayList<ua.naiksoftware.stomp.dto.StompHeader>();

		if (!!this._config.connectHeaders) {
			const keys = Object.keys(this._config.connectHeaders);
			keys.forEach((key) => {
				headers.add(new ua.naiksoftware.stomp.dto.StompHeader(key, this._config.connectHeaders[key]));
			});
		}

		this.mStompClient.connect(headers);
	}

	private _resetSubscriptions() {
		if (!!this._compositeDisposable) {
			this._compositeDisposable.dispose();
		}

		this._compositeDisposable = new io.reactivex.disposables.CompositeDisposable();
	}

	private _resetTopicDisposables() {
		if (!!this._topicCompositeDisposable) {
			this._topicCompositeDisposable.dispose();
		}

		this._callbacks = { topics: [], messages: [] };
		this._listOfTopicsDisposable = new Array<{ destination: string, disposable: io.reactivex.disposables.Disposable}>();
		this._topicCompositeDisposable = new io.reactivex.disposables.CompositeDisposable();
	}

	private _startAutoReConnect() {
		if(this._config.autoReconnect && !!this.mStompClient) {
			this._callDebug(`[STOMP_CONNECTOR_DEBUG] attempt to reconnect to ws`);
			this._callDebug(`[STOMP_CONNECTOR_DEBUG] clean disposable and callbacks.. I'm on the dark NOW! `);

			this._resetSubscriptions();
			this._cleanTopicCallbacksAndUnsubscribe(() => {
				var autoReconnectInterval = setInterval(() => {
					if (!this.mStompClient.isConnected()) {
						this._callDebug(`[STOMP_CONNECTOR_DEBUG] and now? Did we connect?`);
						
						this.mStompClient.reconnect();
					} else {
						this._callDebug(`[STOMP_CONNECTOR_DEBUG] reconnect to lifecycle!`);
						this._connectToStompClientLifecycle();
	
						if (!!this._config.onReconnect && (typeof this._config.onReconnect === 'function')) {
							this._config.onReconnect();
						}
	
						clearInterval(autoReconnectInterval);
					}
				}, !!this._config.reconnectDelay ? this._config.reconnectDelay : 2000);
			});

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

				const that = new WeakRef(this);
				this._callDebug(`[STOMP_CONNECTOR_DEBUG] attempt to subscribe to topic: ${destination}`);
				
				const newTopiDisposable = this.mStompClient
						.topic(destination)
						.subscribeOn(io.reactivex.schedulers.Schedulers.io())
						.observeOn(io.reactivex.android.schedulers.AndroidSchedulers.mainThread())
						.subscribe(new io.reactivex.functions.Consumer({
								accept: function (topicMessage: ua.naiksoftware.stomp.dto.StompMessage) {
									console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> WARM THAT SHIT");
									console.dir(topicMessage.getPayload());
									that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] topic message received from destination: ${destination}`);
									that.get()._notify('topics', destination, JSON.parse(topicMessage.getPayload()));
								},
							}), new io.reactivex.functions.Consumer({
								accept: function (throwable: any /*Throwable*/) {
									that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] topic message error from destination: ${destination} | error: ${JSON.stringify(throwable)}`);
									that.get()._notify('topics', destination, null, JSON.stringify(throwable));
								},
							})
						);

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
		const that = new WeakRef(this);
		that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] topicId? ${this.mStompClient.getTopicId(destination)}`);
		if (!!this.mStompClient && !!this.mStompClient.getTopicId(destination)) {
			this._removeTopicFromDisposable(destination);
			
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
			const topicDisposableToDispose = this._listOfTopicsDisposable.splice(index, 1)[0];
			this._topicCompositeDisposable.remove(topicDisposableToDispose.disposable)

			topicDisposableToDispose.disposable.dispose();
		}
	}

	public send(request: StompSendMessage, callback?: () => void, fail?: (payload: StompFailMessage) => {}) {
		const that = new WeakRef(this);
        if (!!this.mStompClient) {
			this._callDebug(`[STOMP_CONNECTOR_DEBUG] attempt to send message to destination: ${request.destination}`);

			const _stompSendMessage = this._buildStompSendMessageRequestObject(request);
			this._compositeDisposable.add(
				this.mStompClient.send(_stompSendMessage)
					.unsubscribeOn(io.reactivex.schedulers.Schedulers.newThread())
					.subscribeOn(io.reactivex.schedulers.Schedulers.io())
					.observeOn(io.reactivex.android.schedulers.AndroidSchedulers.mainThread())
					.subscribe(new io.reactivex.functions.Action({
						run: function() {
							that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] message sent`);
						}
					}), new io.reactivex.functions.Consumer({
						accept: function(throwable: any /*Throwable*/) {
							that.get()._callDebug(`[STOMP_CONNECTOR_DEBUG] message error: ${JSON.stringify(throwable)}`);
						}
					})
				)
			);
        }
	}

	private _buildStompSendMessageRequestObject(request: StompSendMessage) {
		let headers = new java.util.ArrayList<ua.naiksoftware.stomp.dto.StompHeader>();
		headers.add(new ua.naiksoftware.stomp.dto.StompHeader('destination', request.destination));

		if (!!request.withHeaders) {
			const keys = Object.keys(request.withHeaders);
			keys.forEach((key) => {
				headers.add(new ua.naiksoftware.stomp.dto.StompHeader(key, request.withHeaders[key]));
			});
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
				callBackEvent.fail({ destination: destination, error: error });
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
		if (!!topics && topics.length > 0) {
			const index = topics.findIndex((topic) => topic.destination === destination);
			if (index >= 0) {
				this._callDebug(`[STOMP_CONNECTOR_DEBUG] removed from position ${index}`);
				this._callbacks[type].splice(index, 1);
			}
		}
	}

	private _cleanTopicCallbacksAndUnsubscribe(callback: () => void): void {
		this._callDebug(`[STOMP_CONNECTOR_DEBUG] removing 'topics' all destinations and unsubscribe from callback listener`);
		var topics = this._callbacks['topics'];
		if (!!topics && topics.length > 0) {
			topics.forEach((topic, index) => {
				this._callDebug(`[STOMP_CONNECTOR_DEBUG] removed from position ${index}`);
				const topicDisposableIndex = this._listOfTopicsDisposable.findIndex((topicDisposable) => topicDisposable.destination === topic.destination);
				if (topicDisposableIndex >= 0) {
					this._callDebug(`[STOMP_CONNECTOR_DEBUG] removed disposable `);
					const topicDisposableToDispose = this._listOfTopicsDisposable.splice(topicDisposableIndex, 1)[0];
					this._topicCompositeDisposable.remove(topicDisposableToDispose.disposable);
					topicDisposableToDispose.disposable.dispose();
				}

				var toUnsubscribe = this._callbacks['topics'].splice(index, 1);
				
				this.mStompClient.unsubscribePath(toUnsubscribe[0].destination).subscribe(new io.reactivex.functions.Action({
					run: function() {}
				}), new io.reactivex.functions.Consumer({
					accept: function (throwable: any /*Throwable*/) {},
				}));
			});
		}

		this._callDebug(`[STOMP_CONNECTOR_DEBUG] what remains from callback array ${JSON.stringify(this._callbacks)}`);
		this._callDebug(`[STOMP_CONNECTOR_DEBUG] what remains from topic list disposable? ${JSON.stringify(this._listOfTopicsDisposable)}`);

		callback();
	}
}