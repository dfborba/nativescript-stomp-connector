import { StompConfig, StompHeaders, StompMessage } from './stomp-connector.common';

type LifecycleEvent = ua.naiksoftware.stomp.dto.LifecycleEvent;
type StompClient = ua.naiksoftware.stomp.StompClient;

export class StompConnector {
	private _callbacks: {
		topics: [{ destination: string, callback: (payload: StompMessage) => void }?], 
        messages: [{ destination: string, callback: (payload: StompMessage) => void }?]};
	private _mStompClient: ua.naiksoftware.stomp.StompClient; /* ua.naiksoftware.stomp.StompClient() */
	private _compositeDisposable: any; /* io.reactivex.disposables.CompositeDisposable */
	private _topicCompositeDisposable: any; /* io.reactivex.disposables.CompositeDisposable */

	private _sendMessageCallback: io.reactivex.functions.Action;
	private _sendMessageFailCallback: io.reactivex.functions.Consumer<any>;

	constructor() {
		this._callbacks = { topics: [], messages: [] };
		this._sendMessageCallback = new io.reactivex.functions.Action({
            run: function() {
                console.log('Message sent');
            }
        });

        this._sendMessageFailCallback = new io.reactivex.functions.Consumer({
            accept: function(throwable: any /*Throwable*/) {
                console.log('Error sending the message' + throwable.getMessage());
            }
        });
	}

	connect(config: StompConfig) {
		if (!!this.mStompClient) {
			this.disconnect();
		}

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

		const successCB = new io.reactivex.functions.Consumer<LifecycleEvent>({
			accept: (lifecycleEvent: LifecycleEvent) => {
				console.log(`lifecycleEvent: ${lifecycleEvent.getType()}`);

				switch (lifecycleEvent.getType()) {
					case ua.naiksoftware.stomp.dto.LifecycleEvent.Type.OPENED:
						config.onConnect();
						break;
					case ua.naiksoftware.stomp.dto.LifecycleEvent.Type.ERROR:
						console.error(lifecycleEvent.getException().toString());
						config.onStompError.call(lifecycleEvent.getException().toString());
						break;
					case ua.naiksoftware.stomp.dto.LifecycleEvent.Type.CLOSED:
						config.onDisconnect.call(lifecycleEvent.getMessage());
						this._resetSubscriptions();
						break;
					case ua.naiksoftware.stomp.dto.LifecycleEvent.Type.FAILED_SERVER_HEARTBEAT:
						config.onFailedServerHeartBeat.call(lifecycleEvent.getMessage());
						break;
				}
			},
		});

		const errorCB = new io.reactivex.functions.Consumer<any>({
			accept: function (throwable: any /*Throwable*/) {
				console.log('lifecycleEvent' + throwable.getMessage());
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

	public disconnect() {
        if (!!this.mStompClient) {
            this.mStompClient.disconnect();
            this.mStompClient = null;
        }
	}

	public topic(
		destination: string,
		callback: (payload: StompMessage) => {}
	) {
		this._callbacks['topics'].push({ destination: destination, callback: callback });
		const that = new WeakRef(this);

		const _subscribeCallback = new io.reactivex.functions.Consumer({
			accept: function (topicMessage: ua.naiksoftware.stomp.dto.StompMessage) {
				console.log(topicMessage.getPayload());
				that.get()._notify('topics', destination, JSON.parse(topicMessage.getPayload()));
			},
		});

		const _subscribeCallbackError = new io.reactivex.functions.Consumer({
			accept: function (throwable: any /*Throwable*/) {
				console.log('Error subscribing the topic ' + throwable.getMessage());
			},
		});

		console.log('Subscribed to: ' + destination);

		this._topicCompositeDisposable.add(
			this.mStompClient
				.topic(destination)
				.subscribeOn(io.reactivex.schedulers.Schedulers.io())
				.observeOn(io.reactivex.android.schedulers.AndroidSchedulers.mainThread())
				.subscribe(_subscribeCallback, _subscribeCallbackError)
		);
	}

	private _resetTopicSubscriptions() {
		if (!!this._topicCompositeDisposable) {
			this._topicCompositeDisposable.dispose();
			this._callbacks['topics'] = [];
		}

		this._topicCompositeDisposable = new io.reactivex.disposables.CompositeDisposable();
	}

	private _notify(type: string, destination: string, response: any): void {
		var topics = this._callbacks[type];
		if (topics.length > 0) {
			const topicEvent = topics.find((topic) => topic.destination === destination);
			console.log(topicEvent);
			topicEvent.callback({ destination: destination, payload: response});
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

	public send(message: string, toDestination: string, withHeaders?: StompHeaders, withReceipt?: string): void {
        if (this.mStompClient) {
			this.mStompClient
				.send(toDestination, message)
				.subscribe(this._sendMessageCallback, this._sendMessageFailCallback);
        }
	}

	set mStompClient(stompClient: StompClient) {
		this._mStompClient = stompClient;
	}

	get mStompClient() {
		return this._mStompClient;
	}
}