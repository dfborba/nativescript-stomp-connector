import { StompConfig, StompFailMessage, StompHeaders, StompMessage, StompSendMessage } from './stomp-connector.common';

class MyStompClientLibDelegateImpl extends NSObject implements StompClientLibDelegate {
	public static ObjCProtocols = [ StompClientLibDelegate ];
	private _owner: WeakRef<any>;

	public static initWithOwner(owner: WeakRef<any>): MyStompClientLibDelegateImpl {
        let delegate = this.new();
        delegate._owner = owner;
        return delegate;
	}
	
	static new(): MyStompClientLibDelegateImpl {
        return <MyStompClientLibDelegateImpl>super.new();
	}

	stompClientWithClientDidReceiveMessageWithJSONBodyAkaStringBodyWithHeaderWithDestination(client: StompClientLib, jsonBody: string, stringBody: string, headers: any, destination: string): void {
		if (!!this._owner) {
			this._owner.get()._callDebug(`stompClientDidReceiveMessageWithJSONBodyWithJSONBodyAkaStringBodyWithHeaderWithDestination: ${jsonBody} | ${stringBody} | ${headers} | ${destination}`);
			this._owner.get()._notify('topics', destination, stringBody);
		}
	}

	stompClientDidConnectWithClient(client: StompClientLib): void {
		if (!!this._owner) {
			this._owner.get()._callDebug(`stompClientDidConnectWithClient`);
			this._owner.get()._config.onConnect();	
		}
	}

	stompClientDidDisconnectWithClient(client: StompClientLib): void {
		if (!!this._owner) {
			this._owner.get()._callDebug(`stompClientDidDisconnectWithClient`);
			this._owner.get()._config.onDisconnect();
		}
	}
	
	serverDidSendReceiptWithClientWithReceiptId(client: StompClientLib, receiptId: string): void {
		if (!!this._owner) {
			this._owner.get()._callDebug(`serverDidSendReceiptWithClientWithReceiptId | ${receiptId}`);
		}
	}
	
	serverDidSendErrorWithClientWithErrorMessageDetailedErrorMessage(client: StompClientLib, description: string, message: string): void {
		if (!!this._owner) {
			this._owner.get()._callDebug(`serverDidSendErrorWithClientWithErrorMessageDetailedErrorMessage: ${description} | ${message}`);
			this._owner.get()._config.onStompError.call(description + message);
		}
	}

	serverDidSendPing(): void {
		if (!!this._owner) {
			this._owner.get()._callDebug(`serverDidSendPing`);
		}
	}
}

export class StompConnector {
	private _callbacks: {
		topics: [{ destination: string, callback: (payload: StompMessage) => void, fail?: (error: StompFailMessage) => void }?], 
        messages: [{ destination: string, callback: () => void, fail?: (error: StompFailMessage) => void  }?]};
	
	private _mStompClient: any;
	private _iosDelegate: MyStompClientLibDelegateImpl;
	
	private _config: StompConfig;

	constructor() {
		this._callbacks = { topics: [], messages: [] };
		this._iosDelegate = MyStompClientLibDelegateImpl.initWithOwner(new WeakRef(this));
	}

    public connect(config: StompConfig): void {
		if (!!this.mStompClient) {
			this.disconnect();
		}

		this._config = config;
		this.mStompClient = StompClientLib.new();

		let header: NSDictionary<any, any>;
		if (!!config.connectHeaders) {
			header = this._buildHeader(config.connectHeaders);
		}

		this.mStompClient.openSocketWithURLRequestWithRequestDelegateConnectionHeaders(
			NSURLRequest.requestWithURL(NSURL.URLWithString(config.brokerURL)),
			this._iosDelegate,
			header);
	}

	private _buildHeader(connectHeaders: StompHeaders) {
		let keys = Object.keys(connectHeaders)
		let values = [];
		keys.forEach(key => {
			values.push(connectHeaders[key]);
		})

		return new NSDictionary({objects: values, forKeys: keys });
	}

    public disconnect(): void {
		this._config.autoReconnect = false;
		this.mStompClient.disconnect();
		this.mStompClient = null;
	}

    public topic(
		destination: string,
		callback: (payload: StompMessage) => {},
		fail?: (payload: StompFailMessage) => {}
	) {
		this._callDebug(`>>>>> attempt to subscribe to topic: ${destination}`);

		this._callbacks['topics'].push({ 
			destination: destination, 
			callback: callback, 
			fail: !!fail ? fail : (error) => { console.error(error) } });

		this.mStompClient.subscribeWithHeaderWithDestinationWithHeader(destination, null);
	}

    public send(request: StompSendMessage, callback?: () => void, fail?: (payload: StompFailMessage) => {}) {
		this._callDebug(`>>>>> attempt to send message to destination: ${request.destination}`);

		if (!!callback) {
			this._callbacks['topics'].push({ 
				destination: request.destination, 
				callback: callback, 
				fail: !!fail ? fail : (error) => { console.error(error) } });
		}

		let header: NSDictionary<any, any>;
		if (!!request.withHeaders) {
			header = this._buildHeader(request.withHeaders);
		}

		this.mStompClient.sendMessageWithMessageToDestinationWithHeadersWithReceipt(
			request.message, request.destination, header, request.withReceipt);
	}
	
	set mStompClient(stompClient: StompClientLib) {
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
