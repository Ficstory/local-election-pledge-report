param(
  [string] $ImageRoot = "storage/analysis/20260603/candidate-criminal-records/ocr-pages",
  [string] $TextRoot = "storage/analysis/20260603/candidate-criminal-records/ocr-text",
  [switch] $Force
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.FileAccessMode, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrResult, Windows.Media.Ocr, ContentType = WindowsRuntime] | Out-Null
[Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime] | Out-Null

function Await-Operation($operation, [type] $resultType) {
  $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
      $_.Name -eq "AsTask" -and
      $_.IsGenericMethodDefinition -and
      $_.GetParameters().Count -eq 1 -and
      $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    } |
    Select-Object -First 1
  $task = $method.MakeGenericMethod($resultType).Invoke($null, @($operation))

  $task.GetAwaiter().GetResult()
}

function Read-OcrText([string] $imagePath, $engine) {
  $file = Await-Operation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($imagePath)) ([Windows.Storage.StorageFile])
  $stream = Await-Operation ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Await-Operation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await-Operation ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $result = Await-Operation ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

  $result.Text
}

$imageRootPath = Resolve-Path $ImageRoot
New-Item -ItemType Directory -Path $TextRoot -Force | Out-Null
$textRootPath = Resolve-Path $TextRoot
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage(
  [Windows.Globalization.Language]::new("ko")
)

if (-not $engine) {
  throw "Korean OCR engine is not available on this Windows installation."
}

$images = Get-ChildItem -LiteralPath $imageRootPath.Path -Filter "*.png" | Sort-Object Name
$processed = 0
$skipped = 0

foreach ($image in $images) {
  $textPath = Join-Path $textRootPath.Path ($image.BaseName + ".txt")

  if ((Test-Path $textPath) -and -not $Force) {
    $skipped += 1
    continue
  }

  $text = Read-OcrText $image.FullName $engine
  Set-Content -LiteralPath $textPath -Value $text -Encoding UTF8
  $processed += 1

  if ($processed % 25 -eq 0) {
    Write-Host "OCR processed $processed/$($images.Count) pages"
  }
}

Write-Host "OCR complete: processed $processed, skipped $skipped, target $($images.Count)"
Write-Host $textRootPath.Path
