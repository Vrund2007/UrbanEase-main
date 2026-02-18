# Cleanup script to remove old frontend/ and Images/ directories
# Run this after closing all editors and waiting for OneDrive sync to finish

Write-Host "Cleaning up old directories..." -ForegroundColor Yellow

# Remove frontend directory
if (Test-Path "frontend") {
    Write-Host "Removing frontend/ directory..." -ForegroundColor Cyan
    try {
        Remove-Item -Path "frontend" -Recurse -Force -ErrorAction Stop
        Write-Host "frontend deleted successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "Could not delete frontend: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Some files may be locked. Close editors and try again." -ForegroundColor Yellow
    }
}
else {
    Write-Host "frontend already removed" -ForegroundColor Green
}

# Remove Images directory
if (Test-Path "Images") {
    Write-Host "Removing Images/ directory..." -ForegroundColor Cyan
    try {
        Remove-Item -Path "Images" -Recurse -Force -ErrorAction Stop
        Write-Host "Images deleted successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "Could not delete Images: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Some files may be locked. Close editors and try again." -ForegroundColor Yellow
    }
}
else {
    Write-Host "Images already removed" -ForegroundColor Green
}

Write-Host "`nCleanup complete!" -ForegroundColor Green
