
set /A port=8025

start http://localhost:%port%/

py -m http.server %port%
