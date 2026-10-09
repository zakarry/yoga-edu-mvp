$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskRule = (Get-Content -LiteralPath (Join-Path $taskRoot 'src/lib/voicePronunciation.json') -Encoding UTF8 -Raw | ConvertFrom-Json).treeStability
$taskSynth = [System.Speech.Synthesis.SpeechSynthesizer]::new()
try {
  $taskSynth.SelectVoice($taskRule.voice)
  $taskSynth.SetOutputToWaveFile((Join-Path $taskRoot ('public/voice/' + $taskRule.audioKey + '.wav')))
  $taskSynth.Speak($taskRule.speechText)
} finally {
  $taskSynth.Dispose()
}
