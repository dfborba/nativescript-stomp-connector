import { StompConnector, StompMessage } from 'nativescript-stomp-connector';
import { ChangeDetectorRef, Component, OnInit } from "@angular/core";

@Component({
    selector: "Home",
    templateUrl: "./home.component.html"
})
export class HomeComponent implements OnInit {
    private url = "ws://10.0.0.2:8080/chat/websocket";
    private stompClient: StompConnector;
    public connectionStatus: string = 'Not connected';
    public logs1: Array<StompMessage>;
    public logs2: Array<StompMessage>;

    public messageContent: string = '';

    constructor(private _changeDetectorRef: ChangeDetectorRef) {
        this.stompClient = new StompConnector();
        this.logs1 = new Array<StompMessage>();
        this.logs2 = new Array<StompMessage>();
    }

    ngOnInit(): void {
        // Init your component properties here.
        this.connect();
    }

    connect() {
        this.connectionStatus = 'Trying to connect';
        this.stompClient.connect({
            brokerURL: this.url,
            connectHeaders: {
                "X-Authorization":
                    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhOWM4NGZjZTdiMDU0Njk2YmI0N2Q1YTkxZDVhMDEwMCIsInJvbGUiOiJQQVJUTkVSIiwiaXNzIjoiV2l0ZnkuaW8iLCJhY2NlcHRfdGVybXMiOnRydWUsImVtYWlsX2NvbmZpcm1lZCI6dHJ1ZSwiZXhwIjoxNjA5MjAwNTU3LCJpYXQiOjE2MDEzMzgxNTd9.WxsshIz33Sb8EtJAH0VG2UtO1CYMZ4oPO7hTVvvMruT_OdPz1uWlOtiU_pruuV4h7LaZ4ut-ar5PpccYSRe2ng",
            },
            onConnect: () => {
                console.log("------------------ ON CONNECT -------------------");
                this.connectionStatus = 'CONNECTED';
                this._changeDetectorRef.detectChanges();
            },
            onStompError: (error) => {
                console.log("------------------- ON ERROR --------------------");
                console.log(error);
                console.log("-------------------------------------------------");
                this.connectionStatus = 'ERROR';
                this._changeDetectorRef.detectChanges();
            },
        });
    }

    subscribeToMessage1() {
        this.stompClient.topic(
            '/queue/messages/chat-id-2f33c217-7e76-4adf-801f-db7822f76975',
            (response: StompMessage) => {
                console.log("------------------ SUBSCRIPTION RESPONSE -------------------");
                console.dir(response);
                this.logs1.push(response);
                this._changeDetectorRef.detectChanges();
            });
    }

    subscribeToMessage2() {
        this.stompClient.topic(
            '/queue/messages/chat-id-e8919486-7960-48db-b73a-746bdda23b91',
            (response: StompMessage) => {
                console.log("------------------ SUBSCRIPTION RESPONSE -------------------");
                console.dir(response);
                this.logs2.push(response);
                this._changeDetectorRef.detectChanges();
            });
    }

    sendMessage() {
        this.stompClient.send(
            JSON.stringify({ content: this.messageContent }),
            '/app/chat/2f33c217-7e76-4adf-801f-db7822f76975', 
            {"X-Authorization":
                    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhOWM4NGZjZTdiMDU0Njk2YmI0N2Q1YTkxZDVhMDEwMCIsInJvbGUiOiJQQVJUTkVSIiwiaXNzIjoiV2l0ZnkuaW8iLCJhY2NlcHRfdGVybXMiOnRydWUsImVtYWlsX2NvbmZpcm1lZCI6dHJ1ZSwiZXhwIjoxNjA5MjAwNTU3LCJpYXQiOjE2MDEzMzgxNTd9.WxsshIz33Sb8EtJAH0VG2UtO1CYMZ4oPO7hTVvvMruT_OdPz1uWlOtiU_pruuV4h7LaZ4ut-ar5PpccYSRe2ng" });
    }
}
