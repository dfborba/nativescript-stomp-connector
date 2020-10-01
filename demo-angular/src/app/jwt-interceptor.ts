import { Injectable } from "@angular/core";
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
} from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    intercept(
        request: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        // add authorization header with jwt token if available
		const currentToken = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkYm9yYmEiLCJleHAiOjE2MDEwMzgxODUsImlhdCI6MTYwMTAyMDE4NX0.COJ1NN1Y5WQqTvt80qHmk5VidhL02Y3D6pLNkH0YKrmiuqG9j6IX19H8_A847PY5yNTR3FopY5t31cX4af14vg";
		console.log("Going through here?");
        request = request.clone({
            setHeaders: {
                Authorization: `${currentToken}`,
            },
        });

        return next.handle(request);
    }
}
