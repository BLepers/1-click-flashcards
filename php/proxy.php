<?php

$request_url = rawurldecode($_GET['csurl']);
$request_url = str_replace('*', '+', $request_url);
$parsed = parse_url($request_url);
$check_url = isset($parsed['host']) ? $parsed['host'] : '';

if($check_url == 'context.reverso.net') {
   echo <<<EOL
<div>
   <div class="translation ltr dict">disabled</div>
   <div>
      <div class="src ltr">
      The reverso proxy is disabled in the demo to avoid the server being <em>blacklisted</em>... Search for <em>snarl up</em> or <em>while away</em> to see cached Reverso results.
      </div>
      <div class="trg ltr">
      Le proxy reverso est désactivé dans la démo pour éviter d'être mis sur <em>liste noire</em>... Recherchez <em>snarl up</em> ou <em>while away</em> pour voir les résultats Reverso du cache.
      </div>
   </div>
</div>
EOL;
} else {
   header('Content-Type: application/json');
   echo '{"list":[{"definition":"The urban dictionary proxy is disabled in the demo to avoid being blacklisted. See <a href=\"#!bloody oath\">bloody oath</a> for an example of cached output.","example":"Other examples: <a href=\"#!yobo\">yobo</a>, <a href=\"#!flaming galah\">flaming galah</a>, ..."}]}';

   
}
