<?php

require_once('../config.php');
if($read_only)
   die("Oxford disabled in read only mode");

$word_id = strtolower($_GET['word']);
$lang_code = "en-gb";
$strictMatch = "false";

$ch = curl_init();
$url="https://od-api.oxforddictionaries.com:443/api/v2/entries/".$lang_code."/".$word_id ."?strictMatch=".$strictMatch;

curl_setopt($ch,CURLOPT_URL,$url);
curl_setopt($ch,CURLOPT_SSL_VERIFYPEER,false);
curl_setopt($ch,CURLOPT_RETURNTRANSFER,true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    "app_id: $oxford_id",
    "app_key: $oxford_key"
));

header('Content-Type: application/json');
echo curl_exec($ch);

?>
