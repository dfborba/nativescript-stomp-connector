import { StompConfig, StompConnector, StompMessage } from 'nativescript-stomp-connector';
import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { ObservableArray } from "@nativescript/core";

@Component({
    selector: "Home",
    templateUrl: "./home.component.html"
})
export class HomeComponent implements OnInit {
    private url = "ws://10.0.0.2:4242/greetings/websocket";
    private stompClient: StompConnector;
    public connectionStatus: string = 'Not connected';
    public logs: ObservableArray<string>;

    public messageContent: string = '';
    public token: string = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkYm9yYmEiLCJleHAiOjE2MDU2ODk3OTAsImlhdCI6MTYwNTY3MTc5MH0.HAZDrqGkvU5y4g3bLn4WLYILHA2SSGbh4VhQbvkyt6PvneR3E6IHnTjYHBkJAzWSBDwvIWeleOPSB5Y6bngXnA";

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
                this.logs.unshift('CONNECTED');
                this.isConnected = true;
                if (!this._changeDetectorRef['destroyed']) {
					this._changeDetectorRef.detectChanges();
				}
            },
            onReconnect: () => {
                this.connectionStatus = 'CONNECTED';
                this.logs.unshift('CONNECTED');
                this.isConnected = true;
                if (!this._changeDetectorRef['destroyed']) {
					this._changeDetectorRef.detectChanges();
				}
            },
            onStompError: (error) => {
                this.connectionStatus = 'ERROR';
                this.logs.unshift('ERROR');
                this.logs.unshift(error);
            },
            onDisconnect: () => {
                this.connectionStatus = 'DISCONNECT';
                this.isConnected = false;
                if (!this._changeDetectorRef['destroyed']) {
					this._changeDetectorRef.detectChanges();
				}
                this.logs.unshift('DISCONNECT');
            },
            debug: (msg: string) => {
                this.logs.unshift(`#DEBUG ${msg}`);
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
                this.logs.unshift(JSON.stringify(response.payload));
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
                this.logs.unshift('Message just sent!');
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
                this.logs.unshift('Message just sent!');
            });
    }

    connected() {
        this.logs.unshift('Is connected? ' + (this.stompClient.isConnected() ? 'YES' : 'NO'));
    }
}
