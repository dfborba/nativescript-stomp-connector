import { ReactiveFormsModule } from '@angular/forms';
import { NativeScriptCommonModule, NativeScriptFormsModule } from 'nativescript-angular';
import { HTTP_INTERCEPTORS } from "@angular/common/http";
import { NgModule, NO_ERRORS_SCHEMA } from "@angular/core";
import { NativeScriptModule } from "nativescript-angular/nativescript.module";
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { CustomInterceptor } from "./custom-interceptor";
import { JwtInterceptor } from "./jwt-interceptor";


@NgModule({
    bootstrap: [
        AppComponent
    ],
    imports: [
        NativeScriptModule,
        NativeScriptCommonModule,
        NativeScriptFormsModule,
		ReactiveFormsModule,
        AppRoutingModule
    ],
    declarations: [
        AppComponent
    ],
    providers: [
        { provide : HTTP_INTERCEPTORS, useClass: CustomInterceptor, multi   : true },
        { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    ],
    schemas: [
        NO_ERRORS_SCHEMA
    ]
})
export class AppModule { }
