import { StompConfig, StompConnector, StompMessage } from 'nativescript-stomp-connector';
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
    public token: string = "Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkYm9yYmEiLCJleHAiOjE2MDI5ODkwNTksImlhdCI6MTYwMjk3MTA1OX0.4FaztQbhxzpjFegGdHUL_kVM7ypnocWIKlHXgUd1zdOXJe5RvpYOKPLdYi7WCX0zPorWvhxqxjoMApqgkPBEYw";

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
            '/topic/broadcast',
            (response: StompMessage) => {
                console.log("------------------ SUBSCRIPTION RESPONSE -------------------");
                console.dir(response);
                this.logs.push(JSON.stringify(response.payload));
                this._changeDetectorRef.detectChanges();
            });
    }

    unsubscribeToTopic() {
        this.stompClient.unsubscribe('/topic/broadcast', () => {
            console.log("Unsubscribed successfully");
        })
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
