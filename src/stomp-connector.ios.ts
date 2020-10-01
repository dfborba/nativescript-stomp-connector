import { StompConfig, StompHeaders, StompMessage } from './stomp-connector.common';

class StompClientLibDelegateImpl extends NSObject implements StompClientLibDelegate {
	public static ObjCProtocols = [StompClientLibDelegate];
	private _owner: WeakRef<any>;

	public static initWithOwner(owner: WeakRef<any>): StompClientLibDelegateImpl {
        let delegate = this.new();
        delegate._owner = owner;
        return delegate;
	}
	
	static new(): StompClientLibDelegateImpl {
        return <StompClientLibDelegateImpl>super.new();
	}

	stompClientDidReceiveMessageWithJSONBody?(client: StompClientLib, jsonBody: string): void {
		console.log(`stompClientDidReceiveMessageWithJSONBody: ${jsonBody}`);
	}

	stompClientDidReceiveMessageWithJSONBodyWithHeader?(client: StompClientLib, jsonBody: string, headers: [String: string]): void {
		console.log(`stompClientDidReceiveMessageWithJSONBodyWithHeader: ${jsonBody} | ${headers}`);
	}

	stompClientDidReceiveMessageWithJSONBodyWithHeaderWithDestination?(client: StompClientLib, jsonBody: string, headers: [String: string], destination: string): void {
		console.log(`stompClientWithDidReceiveMessageWithJSONBodyWithHeaderWithDestination: ${jsonBody} | ${headers} | ${destination}`);
	}

	stompClientDidConnect?(client: StompClientLib): void {
		console.log(`stompClientDidConnect`);
	}

	stompClientDidDisconnect?(client: StompClientLib): void {
		console.log(`stompClientDidDisconnect`);
	}

	serverDidSendReceiptWithReceiptId?(client: StompClientLib, receiptId: string): void {
		console.log(`serverDidSendReceiptWithReceiptId | ${receiptId}`);
	}

	serverDidSendError?(client: StompClientLib): void {
		console.log(`serverDidSendError`);
	}

	serverDidSendErrorWithErrorMessage?(client: StompClientLib, description: string): void {
		console.log(`serverDidSendErrorWithErrorMessage: ${description}`);
	}

	serverDidSendErrorWithErrorMessageDetailedErrorMessage ?(client: StompClientLib, description: string, message: string): void {
		console.log(`serverDidSendErrorWithErrorMessageDetailedErrorMessage: ${description} | ${message}`);
	}

	serverDidSendPing?(): void {
		console.log(`serverDidSendPing`);
	}
}

export class StompConnector {
	private _callbacks: {
		topics: [{ destination: string, callback: (payload: StompMessage) => {} }?], 
        messages: [{ destination: string, callback: (payload: StompMessage) => {} }?]};
	
	private _iosDelegate: StompClientLibDelegateImpl;
    private _mStompClient: StompClientLib;

	constructor() {
		this._callbacks = { topics: [], messages: [] };
		this._iosDelegate = StompClientLibDelegateImpl.initWithOwner(this);
	}

    public connect(config: StompConfig): void {
		if (!!this._mStompClient) {
			this.disconnect();
		}

		this._mStompClient = StompClientLib.new();
		if (!!config.connectHeaders) {
			this._mStompClient.openSocketWithURLRequest
		} else {

		}
	}

    public disconnect(): void {
		this._mStompClient.disconnect();
	}

    public topic(destination: string, callback: (payload: StompMessage) => void): void {
		this._mStompClient.subscribe(destination);
	}

    public send(message: string, toDestination: string, withHeaders?: [String: string], withReceipt?: string): void {
		if (!!withHeaders) {
			if (!!withReceipt) {
				this._mStompClient.sendMessageToDestinationWithHeadersWithReceipt(message, toDestination, withHeaders, withReceipt);
			} else {
				this._mStompClient.sendMessageToDestinationWithHeaders(message, toDestination, withHeaders);
			}
		} else {
			this._mStompClient.sendMessageToDestination(message, toDestination);
		}
	}

    private _notify(type: string, destination: string, response: any): void {

	}

	private _removeFromCallback(type: string, destination: string): void {

	}
}
