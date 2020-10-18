import { StompConfig, StompConnector, StompMessage } from 'nativescript-stomp-connector';
import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { ObservableArray } from "@nativescript/core";

@Component({
    selector: "Home",
    templateUrl: "./home.component.html"
})
export class HomeComponent implements OnInit {
    private url = "ws://10.0.0.2:8080/broadcast/websocket";
    private stompClient: StompConnector;
    public connectionStatus: string = 'Not connected';
    public logs: ObservableArray<string>;

    public messageContent: string = '';
    public token: string = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhOWM4NGZjZTdiMDU0Njk2YmI0N2Q1YTkxZDVhMDEwMCIsInJvbGUiOiJQQVJUTkVSIiwiaXNzIjoiV2l0ZnkuaW8iLCJhY2NlcHRfdGVybXMiOnRydWUsImVtYWlsX2NvbmZpcm1lZCI6dHJ1ZSwiZXhwIjoxNjEwOTY1NDgzLCJpYXQiOjE2MDMwMTY2ODN9.yWBHYVu41DQ9i_kHsyJHbLnlmoyNRplKgvEmm8WHCVLtj28OG0oeK7EOU_Hg0XJPS8sGQynQLeCVaCFTAStH3A";

    public isConnected = false;

    constructor(private _changeDetectorRef: ChangeDetectorRef) {
        this.stompClient = new StompConnector();
        this.logs = new ObservableArray<string>();
    }

    ngOnInit(): void {
        this.connect();
    }

    connect() {
        this.connectionStatus = 'Trying to connect';
        this.stompClient.connect({
            brokerURL: this.url,
            autoReconnect: true,
            reconnectDelay: 6000,
            connectHeaders: {
                "X-Authorization": this.token,
            },
            onConnect: () => {
                this.connectionStatus = 'CONNECTED';
                this.logs.push('CONNECTED');
                this.isConnected = true;
                if (!this._changeDetectorRef['destroyed']) {
					this._changeDetectorRef.detectChanges();
				}
            },
            onReconnect: () => {
                this.connectionStatus = 'CONNECTED';
                this.logs.push('CONNECTED');
                this.isConnected = true;
                if (!this._changeDetectorRef['destroyed']) {
					this._changeDetectorRef.detectChanges();
				}
            },
            onStompError: (error) => {
                this.connectionStatus = 'ERROR';
                this.logs.push('ERROR');
                this.logs.push(error);
            },
            onDisconnect: () => {
                this.connectionStatus = 'DISCONNECT';
                this.isConnected = false;
                if (!this._changeDetectorRef['destroyed']) {
					this._changeDetectorRef.detectChanges();
				}
                this.logs.push('DISCONNECT');
            },
            debug: (msg: string) => {
                this.logs.push(`#DEBUG ${msg}`);
            }
        } as StompConfig);
    }

    disconnect() {
        this.stompClient.disconnect();
    }

    subscribeToTopic() {
        this.stompClient.topic(
            '/queue/messages/chat-id-17a1f8da-e338-460b-83b4-afc130d2fe33',
            (response: StompMessage) => {
                console.log("------------------ SUBSCRIPTION RESPONSE -------------------");
                console.dir(response);
                this.logs.push(JSON.stringify(response.payload));
                if (!this._changeDetectorRef['destroyed']) {
					this._changeDetectorRef.detectChanges();
				}
            });
    }

    unsubscribeToTopic() {
        this.stompClient.unsubscribe('/queue/messages/chat-id-17a1f8da-e338-460b-83b4-afc130d2fe33', () => {
            console.log("Unsubscribed successfully");
        })
    }

    sendMessage() {
        this.stompClient.send(
            { message: this.messageContent, destination: '/queue/messages/chat-id-17a1f8da-e338-460b-83b4-afc130d2fe33'},
            () => { 
                this.logs.push('Message just sent!');
            });
    }

    sendMessageAsObject() {
        this.stompClient.send(
            { 
                message: JSON.stringify({ content: this.messageContent }), 
                destination: '/queue/messages/chat-id-17a1f8da-e338-460b-83b4-afc130d2fe33',
                withHeaders: { "content-type": "application/json" }
            },
            () => { 
                this.logs.push('Message just sent!');
            });
    }

    connected() {
        this.logs.push('Is connected? ' + (this.stompClient.isConnected() ? 'YES' : 'NO'));
    }
}
