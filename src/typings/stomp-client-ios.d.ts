
interface StompClientLibDelegate extends NSObjectProtocol {
	stompClientWithClientDidReceiveMessageWithJSONBody?(client: any, jsonBody: string): void;
	stompClientWithClientDidReceiveMessageWithJSONBodyAkaStringBody?(client: any, jsonBody: string, stringBody: string): void;
	stompClientWithClientDidReceiveMessageWithJSONBodyAkaStringBodyWithHeader(client: any, jsonBody: string, stringBody: string, headers: any): void;
	stompClientWithClientDidReceiveMessageWithJSONBodyAkaStringBodyWithHeaderWithDestination(client: any, jsonBody: string, stringBody: string, headers: any, destination: string): void;
	stompClientDidConnectWithClient(client: any): void;
	stompClientDidDisconnectWithClient(client: any): void;
	serverDidSendReceiptWithClientWithReceiptId(client: any, receiptId: string): void;
	serverDidSendErrorWithClient(client: any): void;
	serverDidSendErrorWithClientWithErrorMessage(client: any, description: string): void;
	serverDidSendErrorWithClientWithErrorMessageDetailedErrorMessage(client: any, description: string, message: string): void;
	serverDidSendPing(): void;
}

declare var StompClientLibDelegate: {
	prototype: StompClientLibDelegate
};

declare class StompClientLib extends NSObject {
	static alloc(): StompClientLib;
	static new(): StompClientLib;
	delegate: StompClientLibDelegate;
	public openSocketWithURLRequestWithRequestDelegate(request: NSURLRequest, delegate: StompClientLibDelegate);
	public openSocketWithURLRequestWithRequestDelegateConnectionHeaders(request: NSURLRequest, delegate: StompClientLibDelegate, connectionHeaders: any);
	public isConnected(): boolean;
	public disconnect();
	public sendMessageToDestination(message: string, destination: string);
	public sendMessageWithMessageToDestination(message: string, destination: string);
	public sendMessageWithMessageToDestinationWithHeaders(message: string, destination: string, headers: any);
	public sendMessageWithMessageToDestinationWithHeadersWithReceipt(message: string, destination: string, headers: any, receipt: string);
	public subscribeWithDestination(destination: string);
	public unsubscribeWithDestination(destination: string);
}