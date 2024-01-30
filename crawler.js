const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const emitter = require('events');
const colors= require('colors');
const request = require('request');
const moment = require('moment');
emitter.setMaxListeners(500); // Defina um valor apropriado
const dataAtual = moment().format('YYYY-MM-DD_HH-mm');
const arquivoEmails = `emails_${dataAtual}.txt`;
const arquivoTelefones = `telefones_${dataAtual}.txt`;
// Lista de extensões de arquivos de imagem a serem ignoradas
const extensoesImagemIgnoradas = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.pdf'];

const ConfigErros = [
  "warning: mysql",
  "unclosed quotation mark after the character string",
  "quoted string not properly terminated",
  "Incorrect syntax near",
  "SQL command not properly ended",
  "You have an error in your SQL syntax",
  "mysql_numrows()",
  "Input String was not in a correct format",
  "mysql_fetch",
  "num_rows",
  "Error Executing Database Query",
  "Unclosed quotation mark",
  "Error Occured While Processing Request",
  "Server Error",
  "Microsoft OLE DB Provider for ODBC Drivers Error",
  "Invalid Querystring",
  "VBScript Runtime",
  "Syntax Error",
  "GetArray()",
  "FetchRows()",
];

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(() => resolve(''), ms);
  })
}
async function main(url) {
  try {
     const req = await request(`${url}'`, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Accept-Encoding": "*", // Corrigido o nome do cabeçalho
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36",
      },
      followRedirect: false, // Desativa os redirecionamentos automáticos
    });
    console.log(`[Please Wait] - `  + ` ${url} `.green + `VERIFICANDO`.yellow);

    let responseBody = '';

    req.on('data', (chunk) => {
      responseBody += chunk;

      // Verifique o tamanho atual do corpo e decida se deseja continuar ou abortar.
      if (responseBody.length > 1e6) {
        req.abort(); // Isso abortará a solicitação se ela estiver demorando muito.
        console.log(`[ERRO] => ${url} : Resposta muito grande, abortando`.red);
      }
    });

    req.on('end', () => {
      ConfigErros.forEach((err, index) => {
        if (responseBody.indexOf(err) >= 0) {
          console.log(` [SQLI] `.green  + ` ${url.trim()}`.green + ` [TYPE ERROR] ${ConfigErros[index]}`.yellow  + ` #ERRO_BASED`.yellow);
          fs.appendFile(`./output/sqlinject_${dataAtual}.txt`, `${url}` + '\n', () => { });
          return;
        }
      });
    });

    req.on('error', (error) => {
      if (error.code === 'ECONNRESET') {
        // Trate a conexão redefinida aqui, se necessário.
        console.log(`[ERRO] => ${url} : Conexão redefinida`.red);
      } else {
        // Outros erros de solicitação
        console.log(`[ERRO] => ${url} : ${error.message}`.red);
      }
    });
  } catch (error) {
    console.log(`[ERRO] => ${url} : ${error.message}`.red);
  }
}

async function extrairLinksDaPagina(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const links = [];
    $('a').each((index, element) => {
      const href = $(element).attr('href');
      if (href) {
        const linkAbsoluto = new URL(href, url).href;
        links.push(linkAbsoluto);
      }
    });

    return links;
  } catch (error) {
    console.error(`Erro ao fazer a requisição: ${error.message}`);
    return [];
  }
}

async function crawler(url) {
	return new Promise(async (resolve)=>{

		  if (urlsVisitados.has(url)) {
		    return;
		  }

		  console.log('Visitando:', url);
		  urlsVisitados.add(url);

		  if (url.indexOf('?') >= 0 && url.indexOf('=') >= 0) {
		    await main(url);
		  }

		  const links = await extrairLinksDaPagina(url);
		  console.log(" Links extraidos: ", links)
		  for (const link of links) {
		    const urlObj = new URL(link);
		    const extensao = urlObj.pathname.slice((urlObj.pathname.lastIndexOf(".") - 1 >>> 0) + 2);

		    if (
		      urlObj.hostname === new URL(url).hostname &&
		      !urlsVisitados.has(link) &&
		      !extensoesImagemIgnoradas.includes(extensao.toLowerCase())
		    ) {
		      console.log('Visitando link:', link);
		      await crawler(link);
		    }
		  }
		  resolve();
	});
}

const urlsVisitados = new Set();



async function init() {

  	try{
      if(new URL(url)){
    		const parser = new URL(url)
    		const hostname = parser.origin;
  		  crawler(hostname);
      }	
  	}catch(e){
  		console.log(e.message)
  	}
}
init();
