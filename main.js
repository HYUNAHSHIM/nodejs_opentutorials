var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var template = require('./lib/template.js');
var path = require('path');
var sanitizeHtml = require('sanitize-html');

var app = http.createServer(function(request,response){
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname = url.parse(_url, true).pathname;

    //if page defined
    if(pathname === '/') {
      //if home page, which has no query data
      if(queryData.id === undefined){
          fs.readdir('./data', function(error, filelist){
            var title = 'Welcome';
            var description = 'Hello, Node.js';
            var list = template.List(filelist);
            var html = template.HTML(title, list, 
              `<h2>${title}</h2><p>${description}</p>`,
              `<a href="/create">create</a>`
              );
            response.writeHead(200);
            response.end(html);
          });
      } else{ //if not home page, which has query data
        fs.readdir('./data', function(error, filelist){
          var filteredId = path.parse(queryData.id).base;
          fs.readFile(`data/${filteredId}`, 'utf8', function(err, description){
            var title = queryData.id;
            var sanitizedTitle = sanitizedHtml(title);
            var sanitizedDescription = sanitizeHtml(description);
            var list = template.List(filelist);
            var html = template.HTML(sanitizedTitle, list, 
              `<h2>${sanitizedTitle}</h2><p>${sanitizedDescription}</p>`,
              `<a href="/create">create</a> 
              <a href="/update?id=${sanitizedTitle}">update</a> 
              <form action="delete_process" method="post">
                <input type="hidden" name="id" value="${sanitizedTitle}">
                <input type="submit" value="delete">
              </form>`
              );
            response.writeHead(200);
            response.end(html);
          });
        });
      }
    } else if(pathname === '/create') {
      fs.readdir('./data', function(error, filelist){
        var title = 'WEB - create';
        var list = template.List(filelist);
        var html = template.HTML(title, list,
          `<form action="/create_process" method="post">
            <p><input type="text" name="title" placeholder="title"></p>
            <p>
              <textarea name="description" placeholder="description"></textarea>
            </p>
            <p><input type="submit"></p>
          </form>`,
          ``
          );
          response.writeHead(200);
          response.end(html);
      });
    } else if(pathname === '/create_process'){
      var body ='';
      request.on('data', function(data){ //request로 들어온 정보를 조각조각 잘라서 data라는 인자를 톹해서 수신 
        body = body + data;
        //너무 큰 데이터가 들어오면 연결을 끊어버림
        if(body.length > 1e6){
          request.connection.destroy();
        }
      });
      request.on('end', function(){ //정보가 조각조각 들어오다가 끝나면 이 함수 호출하도록 약속
        //post 변수에 post 정보가 들어감
        var post = qs.parse(body);
        var title = post.title;
        var description = post.description;
  
        fs.writeFile(`data/${title}`, description, 'utf8', function(err){
          response.writeHead(302, {Location: `/?id=${title}`});
          response.end('success');
        });
      });
    } else if(pathname === '/update'){
      fs.readdir('./data', function(error, filelist){
        var filteredId = path.parse(queryData.id).base;
        fs.readFile(`data/${filteredId}`, 'utf8', function(err, description){
          var title = queryData.id;
          var list = template.List(filelist);
          var html = template.HTML(title, list,
            ``,
            `<form action="/update_process" method="post">
              <input type="hidden" name="id" value="${title}">
              <p><input type="text" name="title" placeholder="title" value="${title}"></p>
              <p>
                <textarea name="description" placeholder="description">${description}</textarea>
              </p>
              <p><input type="submit"></p>
             </form>`,
            ''
            );
            response.writeHead(200);
            response.end(html);
        });
      });
    } else if(pathname == '/update_process'){
      var body = '';
      request.on('data', function(data){
        body = body + data;
        if(body.length > 1e6){
          request.connection.destroy();
        }
      });
      request.on('end', function(){
        var post = qs.parse(body);
        var id = post.id;
        var title = post.title;
        var description = post.description;
        //file의 제목 변경
        fs.rename(`data/${id}`, `data/${title}`, function(err){
          fs.writeFile(`data/${title}`, description, 'utf8', function(err){
            response.writeHead(302, {Location: `/?id=${title}`});
            response.end('success');
          });
        });
      });
    } else if(pathname === '/delete_process'){
      var body = '';
      request.on('data', function(data){
        body = body + data;
        if(body.length > 1e6){
          request.connection.destroy();
        }
      });
      request.on('end', function(){
        var post = qs.parse(body);
        var id = post.id;
        var filteredId = path.parse(id).base;
        //file 삭제
        fs.unlink(`data/${filteredId}`, function(err){
          response.writeHead(302, {Location: `/`});
          response.end();
        });
      });
    } else { //if page not found
      response.writeHead(404);
      response.end('Not found');
    }
  });
app.listen(3000);