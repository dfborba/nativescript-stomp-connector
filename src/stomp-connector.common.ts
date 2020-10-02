export declare class StompHeaders {
    [key: string]: string;
}

export interface StompMessage {
    destination: string,
    payload: any;
}

export declare class StompConfig {
    brokerURL: string;
    reconnectDelay?: number;
    heartbeatIncoming?: number;
    heartbeatOutgoing?: number;
    splitLargeFrames?: boolean;
    forceBinaryWSFrames?: boolean;
    appendMissingNULLonIncoming?: boolean;
    maxWebSocketChunkSize?: number;
    connectHeaders?: StompHeaders;
    disconnectHeaders?: StompHeaders;
    beforeConnect?: () => void | Promise<void>;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onStompError?: (error: any) => void;
    onFailedServerHeartBeat?: (error: any) => void;
    onWebSocketClose?: (evt: CloseEvent) => void;
    onWebSocketError?: (evt: Event) => void;
    debug?: (msg: string) => void;
}

export declare class StompConnector {
    private _callbacks: {
		topics: [{ destination: string, callback: (payload: StompMessage) => {} }], 
        messages: [{ destination: string, callback: (payload: StompMessage) => {} }]};
    private _mStompClient: any;
    private _compositeDisposable?: any;

	constructor();
    public connect(config: StompConfig): void;
    public disconnect(): void;
    public topic(destination: string, callback: (payload: StompMessage) => void): void;
    public send(message: string, toDestination: string, withHeaders?: StompHeaders, withReceipt?: string): void

    private _notify(type: string, destination: string, response: any): void;
    private _removeFromCallback(type: string, destination: string): void
}