import { StompConnector, StompMessage } from 'nativescript-stomp-connector';
import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { ObservableArray } from "@nativescript/core";

@Component({
    selector: "Home",
    templateUrl: "./home.component.html"
})
export class HomeComponent implements OnInit {
    private url = "ws://10.0.0.2:8080/greetings/websocket";
    private stompClient: StompConnector;
    public connectionStatus: string = 'Not connected';
    public logs: ObservableArray<string>;

    public messageContent: string = '';
    public token: string = "Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkYm9yYmEiLCJleHAiOjE2MDIwMDU0OTYsImlhdCI6MTYwMTk4NzQ5Nn0.nfsJfHIE6yiUqx9lxd7_z0v-UKdSKW3IW-_uHWgkP1KDfwVlbI8kFqcN6NcsOpFuZ9mFa6nfCcK0w_EQI2RRwA";

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
        });
    }

    disconnect() {
        this.stompClient.disconnect();
    }

    subscribeToTopic() {
        this.stompClient.topic(
            '/topic/broadcast',
            (response: StompMessage) => {
                console.log("------------------ SUBSCRIPTION RESPONSE -------------------");
                console.dir(response);
                this.logs.push(JSON.stringify(response.payload));
                this._changeDetectorRef.detectChanges();
            });
    }

    sendMessage() {
        this.stompClient.send(
            { message: this.messageContent, destination: '/app/greetings'},
            () => { 
                this.logs.push('Message just sent!');
            });
    }

    sendMessageAsObject() {
        this.stompClient.send(
            { 
                message: JSON.stringify({ content: this.messageContent }), 
                destination: '/app/greetings',
                withHeaders: { "content-type": "application/json" }
            },
            () => { 
                this.logs.push('Message just sent!');
            });
    }
}
