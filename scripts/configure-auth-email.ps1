# Configure Supabase Auth email for cookingwithtrevor through the Management API:
#   - custom SMTP (Gmail app password)
#   - "Confirm sign up" and "Reset password" templates using /auth/confirm links
# Secrets are typed in when prompted; nothing is stored in this file or echoed.
#
# Run in PowerShell from the project folder:
#   powershell -ExecutionPolicy Bypass -File scripts\configure-auth-email.ps1
#
# You need a Supabase personal access token: https://supabase.com/dashboard/account/tokens
# (create one, run this script, then delete the token on that page).

$ErrorActionPreference = "Stop"
$projectRef = "rddccfohrgjvaplunbgv"

function Read-Secret([string]$prompt) {
  $secure = Read-Host -Prompt $prompt -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringAuth($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$token = Read-Secret "Supabase personal access token"
$gmail = (Read-Host -Prompt "Sender Gmail address (e.g. cookingwithtrevor.noreply@gmail.com)").Trim()
$appPassword = (Read-Secret "Gmail app password (16 characters)") -replace "\s", ""

if ($gmail -notmatch "^[^\s@]+@[^\s@]+\.[^\s@]+$") { throw "That doesn't look like an email address." }
if ($appPassword.Length -ne 16) { Write-Warning "Gmail app passwords are 16 characters; got $($appPassword.Length). Continuing anyway." }

$confirmHtml = @'
<h2>Confirm your email</h2>
<p>Welcome to cookingwithtrevor! Confirm your email to finish signing up.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a></p>
<p>If you didn't sign up, you can ignore this email.</p>
'@

$recoveryHtml = @'
<h2>Reset your password</h2>
<p>We received a request to reset your password. Follow the link below to choose a new one.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Reset password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
'@

$body = @{
  smtp_admin_email                     = $gmail
  smtp_sender_name                     = "cookingwithtrevor"
  smtp_host                            = "smtp.gmail.com"
  smtp_port                            = "465"
  smtp_user                            = $gmail
  smtp_pass                            = $appPassword
  smtp_max_frequency                   = 60
  mailer_subjects_confirmation         = "Confirm your cookingwithtrevor account"
  mailer_templates_confirmation_content = $confirmHtml
  mailer_subjects_recovery             = "Reset your cookingwithtrevor password"
  mailer_templates_recovery_content    = $recoveryHtml
} | ConvertTo-Json

try {
  Invoke-RestMethod -Method Patch `
    -Uri "https://api.supabase.com/v1/projects/$projectRef/config/auth" `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body $body | Out-Null
  Write-Host "Done: SMTP and both email templates are set." -ForegroundColor Green
  Write-Host "Check Supabase > Authentication > Emails: the 'Set up custom SMTP' banner should be gone."
  Write-Host "Now delete the access token at https://supabase.com/dashboard/account/tokens"
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Host "Supabase refused the change (HTTP $status)." -ForegroundColor Red
  if ($status -eq 401) { Write-Host "The access token is wrong or expired." }
  elseif ($status -eq 403) { Write-Host "That token's account doesn't have access to this project." }
  else { Write-Host $_.ErrorDetails.Message }
} finally {
  $token = $null; $appPassword = $null; $body = $null
}
