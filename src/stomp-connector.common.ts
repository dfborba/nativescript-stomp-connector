export declare class StompHeaders {
    [key: string]: string;
}

export interface StompMessage {
    destination: string,
    payload: any;
}

export interface StompFailMessage {
    destination: string,
    error: any;
}

export declare class StompConfig {
    brokerURL: string;
    autoReconnect?: boolean;
    reconnectDelay?: number;
    heartbeatIncoming?: number;
    heartbeatOutgoing?: number;
    connectHeaders?: StompHeaders;
    onConnect?: () => void;
    onReconnect?: () => void;
    onDisconnect?: () => void;
    onStompError?: (error: any) => void;
    onFailedServerHeartBeat?: (error: any) => void;
    debug?: (msg: string) => void;
}

export declare class StompSendMessage {
    message: string;
    destination: string;
    withHeaders?: StompHeaders;
    withReceipt?: string;
}

export declare class StompConnector {
    private _callbacks: {
		topics: [{ destination: string, callback: (payload: StompMessage) => void, fail?: (error: StompFailMessage) => void }?], 
        messages: [{ destination: string, callback: () => void, fail?: (error: StompFailMessage) => void  }?]};
        
    private _mStompClient: any;
    private _config: StompConfig;
    
    constructor();
    
    public connect(config: StompConfig): void;
    public disconnect(): void;
    public isConnected(): boolean;
    public topic(destination: string, callback: (payload: StompMessage) => void, fail?: (payload: StompFailMessage) => {}): void;
    public send(request: StompSendMessage, callback?: () => void, fail?: (payload: StompFailMessage) => {}): void

    private _callDebug(msg: string): void;
    private _notify(type: string, destination: string, response: any): void;
    private _removeFromCallback(type: string, destination: string): void
}

