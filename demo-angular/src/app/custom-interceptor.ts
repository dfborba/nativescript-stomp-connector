import {
	HttpErrorResponse,
	HttpEvent,
	HttpHandler,
	HttpInterceptor,
	HttpRequest,
	HttpResponse
  } from '@angular/common/http';
  import { Injectable } from '@angular/core';
  import { Observable } from 'rxjs';
  import { tap } from 'rxjs/operators';
  
  @Injectable()
  export class CustomInterceptor implements HttpInterceptor {
	log = (req: HttpRequest<any>) =>
	  tap(
		(res: HttpEvent<any>) => {
		  if (res instanceof HttpResponse) {
			console.log(this.logJson(req, res));
		  }
		},
		res => {
		  if (res instanceof HttpErrorResponse) {
			console.log(this.logJson(req, res));
		  }
		}
	  );
  
	logJson(req: HttpRequest<any>, res): string {
	  return `
		  Method=${req.method}
		 Url=${req.urlWithParams}
		 Url Params=${JSON.stringify(
		   req.params
			 .keys()
			 .reduce((acc, c) => ((acc[c] = req.params.get(c)), acc), {})
		 )}
		 Body Params=${JSON.stringify(req.body, null, ' ')}
		 Headers=${JSON.stringify(
		   req.headers.keys().map(x => ({ [x]: req.headers.get(x) })),
		   null,
		   ' '
		 )}
		 ----------------------------------------------------------------------------
		 Response=${JSON.stringify(res, null, ' ')}
		 Headers=${JSON.stringify(
		   res.headers.keys().map(x => ({ [x]: res.headers.get(x) })),
		   null,
		   ' '
		 )}`;
	}
  
	intercept(
	  req: HttpRequest<any>,
	  next: HttpHandler
	): Observable<HttpEvent<any>> {
	  return next.handle(req).pipe(this.log(req));
	}
  }