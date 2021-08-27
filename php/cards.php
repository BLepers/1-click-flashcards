<?php

chdir('..');
require_once('config.php');

$action = $_GET['action'];
$word = isset($_GET['word'])?$_GET['word']:"";
$file = "$card_directory/$word.json";
$sm2cache = "$card_directory/$cache_file";

if(isset($_GET['word'])) {
   $path = realpath(dirname($file));
   $correct_path = realpath($card_directory);
   if($path != $correct_path)
      die('{ "success":"ko", "reason":"Unauthorized action" }');
}

function getAllWords() {
   global $card_directory;
   $files = glob("$card_directory/*.json");
   $words = array_map(function ($s) {
      return pathinfo($s)['filename'];
   }, $files);
   rsort($words);
   return $words;
}


if($action == "getall") { // get all saved words
   echo json_encode(getAllWords());
} else if($action === "get") { // get a definition
   if(file_exists($file))
      echo file_get_contents($file);
   else
      echo json_encode(array());
} else if($action === "put" && !$read_only) { // write a definition
   file_put_contents($file, $_POST['data']);
   echo json_encode(array("success" => "ok"));
} else if($action === "delete" && !$read_only) { // delete a definition
   unlink($file);
   echo json_encode(array("success" => "ok"));
} else if($action === "getallsm2") { // get all learned words, init new words, remove deleted words
   $data = array();
   if(file_exists($sm2cache))
      $data = json_decode(file_get_contents($sm2cache), true);

   $exists = array();
   $words = getAllWords();
   foreach($words as $f) {
      if(!isset($data[$f])) {
         $data[$f] = array(
            'n' => 0,
            'EF' => 2.5,
            'I' => 1,
            'last' => 0,
         );
      }
      $exists[$f] = 1;
   }

   $to_remove = array();
   foreach($data as $f=>$v) {
      if(!isset($exists[$f]))
         $to_remove[] = $f;
   }
   foreach($to_remove as $f) {
      unset($data[$f]);
   }
   if(count($to_remove))
      file_put_contents($sm2cache, json_encode($data));
   echo json_encode($data);
} else if($action === "putsm2" && !$read_only) { // update learned words
   session_start(); // poor man's way of avoiding concurrent accesses to the file without locks
   $data = array();
   if(file_exists($sm2cache))
      $data = json_decode(file_get_contents($sm2cache), true);
   $data[$word] = array(
      'n' => $_GET['n'],
      'EF' => $_GET['EF'],
      'I' => $_GET['I'],
      'last' => time()
   );
   file_put_contents($sm2cache, json_encode($data));
   echo json_encode(array("success" => "ok", "word" => $word, "data" => $data[$word]));
} else if($action === "search" && !$read_only) {
   $ret = array();
   $files = glob("$card_directory/*.json");
   foreach($files as $file) {
      $json = file_get_contents($file);
      if(preg_match($_GET['regex'], $json))
         $ret[] = pathinfo($file)['filename'];
   }
   echo json_encode($ret);
} else if($action === "search") { // in read only, no regex on the server!
   echo json_encode(getAllWords());
} else {
   die('{ "success":"ko", "reason":"Unauthorized action (read only mode)" }');
}
