import re

# Fix SecureDownloadModal.tsx
with open(r'apps\web\components\patient\SecureDownloadModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace FaceVerification import
content = re.sub(r"import \{ FaceVerification \} from '\.\./FaceVerification';\n", "", content)
# Add currentPassword state
content = re.sub(r"const \[isForgotPin, setIsForgotPin\] = useState\(false\);", "const [isForgotPin, setIsForgotPin] = useState(false);\n  const [currentPassword, setCurrentPassword] = useState('');", content)

handle_submit_old = """  const handleForgotPinSubmit = async (file: File) => {
    if (newPin.length !== 6 || newPin !== confirmNewPin) {
      toast.error("New PIN must be 6 digits and match.");
      return false;
    }
    setIsResetting(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('new_pin', newPin);
      
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL as string;
      const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
      
      await axios.post(`${apiUrl}/security/change-pin-face`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("PIN reset successfully! You can now use it to authorize the download.");
      setIsForgotPin(false);
      setPin('');
      return true;
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to reset PIN.");
      return false;
    } finally {
      setIsResetting(false);
    }
  };"""

handle_submit_new = """  const handleForgotPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 6 || newPin !== confirmNewPin) {
      toast.error("New PIN must be 6 digits and match.");
      return false;
    }
    if (!currentPassword) {
      toast.error("Please enter your current account password.");
      return false;
    }
    setIsResetting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL as string;
      const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
      
      const formData = new FormData();
      formData.append('current_password', currentPassword);
      formData.append('new_pin', newPin);

      await axios.post(`${apiUrl}/security/reset-pin-with-password`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("PIN reset successfully! You can now use it to authorize the download.");
      setIsForgotPin(false);
      setPin('');
      setCurrentPassword('');
      return true;
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to reset PIN.");
      return false;
    } finally {
      setIsResetting(false);
    }
  };"""

content = content.replace(handle_submit_old, handle_submit_new)

render_old = """        {isForgotPin ? (
          <div className="space-y-6 py-2">
            <p className="text-sm text-muted-foreground">
              Verify your identity using your enrolled Face ID to securely create a new PIN.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New 6-Digit PIN</label>
                  <Input 
                    type="password" 
                    placeholder="••••••" 
                    className="tracking-widest font-mono text-center text-lg h-12"
                    maxLength={6}
                    value={newPin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm PIN</label>
                  <Input 
                    type="password" 
                    placeholder="••••••" 
                    className="tracking-widest font-mono text-center text-lg h-12"
                    maxLength={6}
                    value={confirmNewPin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>
              
              {(newPin.length === 6 && newPin === confirmNewPin) ? (
                <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-bottom-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-primary">
                    <Camera className="w-4 h-4" /> Verify Face to Confirm Reset
                  </label>
                  <FaceVerification onVerify={handleForgotPinSubmit} />
                </div>
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg border text-center text-sm text-muted-foreground">
                  Enter and confirm your new 6-digit PIN to enable the camera.
                </div>
              )}
            </div>
            
            <div className="pt-2">
              <Button variant="outline" className="w-full" onClick={() => setIsForgotPin(false)} disabled={isResetting}>
                Cancel Reset
              </Button>
            </div>
          </div>"""

render_new = """        {isForgotPin ? (
          <form onSubmit={handleForgotPinSubmit} className="space-y-6 py-2">
            <p className="text-sm text-muted-foreground">
              Verify your identity using your account password to securely create a new PIN.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Account Password</label>
                <Input 
                  type="password" 
                  placeholder="Enter your password" 
                  className="h-12"
                  value={currentPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New 6-Digit PIN</label>
                  <Input 
                    type="password" 
                    placeholder="••••••" 
                    className="tracking-widest font-mono text-center text-lg h-12"
                    maxLength={6}
                    value={newPin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm PIN</label>
                  <Input 
                    type="password" 
                    placeholder="••••••" 
                    className="tracking-widest font-mono text-center text-lg h-12"
                    maxLength={6}
                    value={confirmNewPin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-2 space-y-3">
              <Button type="submit" className="w-full" disabled={isResetting || newPin.length !== 6 || newPin !== confirmNewPin || !currentPassword}>
                {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                Reset PIN
              </Button>
            
              <Button variant="outline" className="w-full" type="button" onClick={() => setIsForgotPin(false)} disabled={isResetting}>
                Cancel Reset
              </Button>
            </div>
          </form>"""

content = content.replace(render_old, render_new)

with open(r'apps\web\components\patient\SecureDownloadModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
