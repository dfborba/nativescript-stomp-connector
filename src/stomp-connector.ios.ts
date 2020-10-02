import { StompConfig, StompMessage } from './stomp-connector.common';

declare var StompClientLib: any;
export declare class StompClientLibDelegate {}

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

	stompClientWithClientDidReceiveMessageWithJSONBody(client: any, jsonBody: string): void {
		console.log(`stompClientDidReceiveMessageWithJSONBodyWithJSONBody: ${jsonBody}`);
		if (!!this._owner) {

		}
	}

	stompClientWithClientDidReceiveMessageWithJSONBodyAkaStringBody(client: any, jsonBody: string, stringBody: string): void {
		console.log(`stompClientDidReceiveMessageWithJSONBodyWithJSONBodyAkaStringBody: ${jsonBody}`);
		if (!!this._owner) {

		}
	}

	stompClientWithClientDidReceiveMessageWithJSONBodyAkaStringBodyWithHeader(client: any, jsonBody: string, stringBody: string, headers: any): void {
		console.log(`stompClientDidReceiveMessageWithJSONBodyWithJSONBodyAkaStringBodyWithHeader: ${jsonBody} | ${headers}`);
		if (!!this._owner) {
			
		}
	}

	stompClientWithClientDidReceiveMessageWithJSONBodyAkaStringBodyWithHeaderWithDestination(client: any, jsonBody: string, stringBody: string, headers: any, destination: string): void {
		console.log(`stompClientDidReceiveMessageWithJSONBodyWithJSONBodyAkaStringBodyWithHeaderWithDestination: ${jsonBody} | ${stringBody} | ${headers} | ${destination}`);
		if (!!this._owner) {
			this._owner.get()._notify('topics', destination, stringBody);
		}
	}

	stompClientDidConnectWithClient(client: any): void {
		console.log(`stompClientDidConnectWithClient`);
		if (!!this._owner) {
			this._owner.get()._config.onConnect();	
		}
	}

	stompClientDidDisconnectWithClient(client: any): void {
		console.log(`stompClientDidDisconnectWithClient`);
		if (!!this._owner) {
			this._owner.get()._config.onDisconnect();
		}
	}
	
	serverDidSendReceiptWithClientWithReceiptId(client: any, receiptId: string): void {
		console.log(`serverDidSendReceiptWithClientWithReceiptId | ${receiptId}`);
		if (!!this._owner) {
			
		}
	}
	
	serverDidSendErrorWithClient(client: any): void {
		console.log(`serverDidSendErrorWithClient`);
		if (!!this._owner) {
			
		}
	}
	
	serverDidSendErrorWithClientWithErrorMessage(client: any, description: string): void {
		console.log(`serverDidSendErrorWithClientWithErrorMessage: ${description}`);
		if (!!this._owner) {
			this._owner.get()._config.onStompError.call(description);
		}
	}

	serverDidSendErrorWithClientWithErrorMessageDetailedErrorMessage(client: any, description: string, message: string): void {
		console.log(`serverDidSendErrorWithClientWithErrorMessageDetailedErrorMessage: ${description} | ${message}`);
		if (!!this._owner) {
			this._owner.get()._config.onStompError.call(description + message);
		}
	}

	serverDidSendPing(): void {
		console.log(`serverDidSendPing`);
		if (!!this._owner) {
			
		}
	}
}

export class StompConnector {
	private _callbacks: {
		topics: [{ destination: string, callback: (payload: StompMessage) => void }?], 
        messages: [{ destination: string, callback: (payload: StompMessage) => void }?]};
	
	private _iosDelegate: MyStompClientLibDelegateImpl;
    private _mStompClient: any;
	private _config: StompConfig;

	constructor() {
		this._callbacks = { topics: [], messages: [] };
		this._iosDelegate = MyStompClientLibDelegateImpl.initWithOwner(new WeakRef(this));
	}

    public connect(config: StompConfig): void {
		this._config = config;

		if (!!this._mStompClient) {
			this.disconnect();
		}

		this._mStompClient = StompClientLib.new();
		if (!!config.connectHeaders) {
			let keys = Object.keys(config.connectHeaders)
			let values = [];
			keys.forEach(key => {
				values.push(config.connectHeaders[key]);
			})
			
			let header = new NSDictionary({objects: values, forKeys: keys });
			this._mStompClient.openSocketWithURLRequestWithRequestDelegateConnectionHeaders(
				NSURLRequest.requestWithURL(NSURL.URLWithString(config.brokerURL)),
				this._iosDelegate,
				header);
		} else {
			this._mStompClient.openSocketWithURLRequestWithRequestDelegate(
				NSURLRequest.requestWithURL(NSURL.URLWithString(config.brokerURL)),
				this._iosDelegate);
		}
	}

    public disconnect(): void {
		this._mStompClient.disconnect();
	}

    public topic(destination: string, callback: (payload: StompMessage) => void): void {
		this._callbacks['topics'].push({ destination: destination, callback: callback });
		this._mStompClient.subscribeWithDestination(destination);
	}

    public send(message: string, toDestination: string, withHeaders?: any, withReceipt?: string): void {
		this._mStompClient.sendMessageWithMessageToDestinationWithHeadersWithReceipt(message, toDestination, withHeaders, withReceipt);
	}

    private _notify(type: string, destination: string, response: any): void {
		var topics = this._callbacks[type];
		if (topics.length > 0) {
			const topicEvent = topics.find((topic) => topic.destination === destination);
			topicEvent.callback({ destination: destination, payload: JSON.parse(response)});
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
