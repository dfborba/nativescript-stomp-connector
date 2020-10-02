import { StompConfig, StompMessage } from './stomp-connector.common';

// export var StompClientLibDelegate: {
// 	prototype: StompClientLibDelegate;
// };

// class MyStompClientLibDelegateImpl extends NSObject implements StompClientLibDelegate {
// 	public static ObjCProtocols = [StompClientLibDelegate];
// 	private _owner: WeakRef<any>;

// 	public static initWithOwner(owner: WeakRef<any>): MyStompClientLibDelegateImpl {
//         let delegate = this.new();
//         delegate._owner = owner;
//         return delegate;
// 	}
	
// 	static new(): MyStompClientLibDelegateImpl {
//         return <MyStompClientLibDelegateImpl>super.new();
// 	}

// 	stompClientDidReceiveMessageWithJSONBody?(client: StompClientLib, jsonBody: string): void {
// 		console.log(`stompClientDidReceiveMessageWithJSONBody: ${jsonBody}`);
// 	}

// 	stompClientDidReceiveMessageWithJSONBodyWithHeader?(client: StompClientLib, jsonBody: string, headers: any): void {
// 		console.log(`stompClientDidReceiveMessageWithJSONBodyWithHeader: ${jsonBody} | ${headers}`);
// 	}

// 	stompClientDidReceiveMessageWithJSONBodyWithHeaderWithDestination?(client: StompClientLib, jsonBody: string, headers: any, destination: string): void {
// 		console.log(`stompClientWithDidReceiveMessageWithJSONBodyWithHeaderWithDestination: ${jsonBody} | ${headers} | ${destination}`);
// 	}

// 	stompClientDidConnect?(client: StompClientLib): void {
// 		console.log(`stompClientDidConnect`);
// 	}

// 	stompClientDidDisconnect?(client: StompClientLib): void {
// 		console.log(`stompClientDidDisconnect`);
// 	}

// 	serverDidSendReceiptWithReceiptId?(client: StompClientLib, receiptId: string): void {
// 		console.log(`serverDidSendReceiptWithReceiptId | ${receiptId}`);
// 	}

// 	serverDidSendError?(client: StompClientLib): void {
// 		console.log(`serverDidSendError`);
// 	}

// 	serverDidSendErrorWithErrorMessage?(client: StompClientLib, description: string): void {
// 		console.log(`serverDidSendErrorWithErrorMessage: ${description}`);
// 	}

// 	serverDidSendErrorWithErrorMessageDetailedErrorMessage ?(client: StompClientLib, description: string, message: string): void {
// 		console.log(`serverDidSendErrorWithErrorMessageDetailedErrorMessage: ${description} | ${message}`);
// 	}

// 	serverDidSendPing?(): void {
// 		console.log(`serverDidSendPing`);
// 	}
// }

export class StompConnector {
	// private _callbacks: {
	// 	topics: [{ destination: string, callback: (payload: StompMessage) => {} }?], 
    //     messages: [{ destination: string, callback: (payload: StompMessage) => {} }?]};
	
	// private _iosDelegate: MyStompClientLibDelegateImpl;
    // private _mStompClient: StompClientLib;

	// constructor() {
	// 	this._callbacks = { topics: [], messages: [] };
	// 	this._iosDelegate = MyStompClientLibDelegateImpl.initWithOwner(new WeakRef(this));
	// }

    // public connect(config: StompConfig): void {
	// 	if (!!this._mStompClient) {
	// 		this.disconnect();
	// 	}

	// 	this._mStompClient = StompClientLib.new();
	// 	if (!!config.connectHeaders) {
	// 		this._mStompClient.openSocketWithURLRequest(
	// 			NSURLRequest.requestWithURL(NSURL.URLWithString(config.brokerURL)),
	// 			this._iosDelegate,
	// 			config.connectHeaders);
	// 	} else {
	// 		this._mStompClient.openSocketWithURLRequest(
	// 			NSURLRequest.requestWithURL(NSURL.URLWithString(config.brokerURL)),
	// 			this._iosDelegate);
	// 	}
	// }

    // public disconnect(): void {
	// 	this._mStompClient.disconnect();
	// }

    // public topic(destination: string, callback: (payload: StompMessage) => void): void {
	// 	this._mStompClient.subscribe(destination);
	// }

    // public send(message: string, toDestination: string, withHeaders?: any, withReceipt?: string): void {
	// 	if (!!withHeaders) {
	// 		if (!!withReceipt) {
	// 			this._mStompClient.sendMessageToDestinationWithHeadersWithReceipt(message, toDestination, withHeaders, withReceipt);
	// 		} else {
	// 			this._mStompClient.sendMessageToDestinationWithHeaders(message, toDestination, withHeaders);
	// 		}
	// 	} else {
	// 		this._mStompClient.sendMessageToDestination(message, toDestination);
	// 	}
	// }

    // private _notify(type: string, destination: string, response: any): void {

	// }

	// private _removeFromCallback(type: string, destination: string): void {

	// }
}
