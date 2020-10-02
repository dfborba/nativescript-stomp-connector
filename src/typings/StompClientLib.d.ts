
 interface StompClientLibDelegate extends NSObjectProtocol {
	stompClient?(client: StompClientLib): void;
	stompClientDidReceiveMessageWithJSONBody?(client: StompClientLib, jsonBody: string): void;
	stompClientDidReceiveMessageWithJSONBodyWithHeader?(client: StompClientLib, jsonBody: string, headers: any): void;
	stompClientDidReceiveMessageWithJSONBodyWithHeaderWithDestination?(client: StompClientLib, jsonBody: string, headers: any, destination: string): void;
	stompClientDidConnect?(client: StompClientLib): void;
	stompClientDidDisconnect?(client: StompClientLib): void;
	serverDidSendReceiptWithReceiptId?(client: StompClientLib, receiptId: string): void;
	serverDidSendError?(client: StompClientLib): void;
	serverDidSendErrorWithErrorMessage?(client: StompClientLib, description: string): void;
	serverDidSendErrorWithErrorMessageDetailedErrorMessage ?(client: StompClientLib, description: string, message: string): void;
	serverDidSendPing?(): void;
}

declare class StompClientLib extends NSObject {
	static alloc(): StompClientLib;
	static new(): StompClientLib;
	delegate: StompClientLibDelegate;
	public openSocketWithURLRequest(request: NSURLRequest, delegate: StompClientLibDelegate);
	public openSocketWithURLRequest(request: NSURLRequest, delegate: StompClientLibDelegate, connectionHeaders: any);
	public isConnected(): boolean;
	public disconnect();
	public sendMessageToDestination(message: string, destination: string);
	public sendMessageToDestinationWithHeaders(message: string, destination: string, headers: any);
	public sendMessageToDestinationWithHeadersWithReceipt(message: string, destination: string, headers: any, receipt: string);
	public subscribe(destination: string);
	public unsubscribe(destination: string);
}