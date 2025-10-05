import { useState, useEffect } from "react";
import {
  Building2,
  FileCheck,
  Download,
  Truck,
  CheckSquare,
  Square,
  Mail,
  AlertCircle,
  LogOut,
  User,
  Settings,
  Menu,
  X
} from "lucide-react";
import { VAHLogo } from "./VAHLogo";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Separator } from "./ui/separator";

interface UserDashboardProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
  onGoBack?: () => void;
}

// Mock mail data for UI display
const mockMailItems = [
  {
    id: "1",
    sender: "HM Revenue & Customs",
    description: "Self Assessment Tax Return 2024",
    receivedDate: "2024-10-01",
    category: "HMRC",
    status: "unread",
    hasAttachment: true,
  },
  {
    id: "2",
    sender: "Companies House",
    description: "Annual Confirmation Statement",
    receivedDate: "2024-09-28",
    category: "Companies House",
    status: "read",
    hasAttachment: true,
  },
  {
    id: "3",
    sender: "Barclays Bank PLC",
    description: "Monthly Statement - September 2024",
    receivedDate: "2024-09-25",
    category: "Bank",
    status: "read",
    hasAttachment: true,
  },
  {
    id: "4",
    sender: "Amazon Business",
    description: "Order Confirmation - Office Supplies",
    receivedDate: "2024-09-22",
    category: "Commercial",
    status: "read",
    hasAttachment: false,
  },
  {
    id: "5",
    sender: "Royal Mail",
    description: "Delivery Notification",
    receivedDate: "2024-09-20",
    category: "Other",
    status: "read",
    hasAttachment: true,
  },
];

export function UserDashboard({ onLogout, onNavigate, onGoBack }: UserDashboardProps) {
  const [selectedMail, setSelectedMail] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Get virtual address from user profile or use default
  const getVirtualAddress = () => {
    if (userProfile?.virtual_address) {
      return userProfile.virtual_address;
    }

    // Fallback to stored user data
    try {
      const storedUser = localStorage.getItem('vah_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.virtual_address) {
          return user.virtual_address;
        }
      }
    } catch (error) {
      console.error('Error parsing stored user address:', error);
    }

    // Default fallback address
    return {
      line1: "71-75 Shelton Street",
      line2: "Covent Garden",
      city: "London",
      postcode: "WC2H 9JQ",
      country: "United Kingdom"
    };
  };

  const virtualAddress = getVirtualAddress();

  // Get user name from profile or fallback to stored user data
  const getUserName = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }

    // Fallback to stored user data
    try {
      const storedUser = localStorage.getItem('vah_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.first_name && user.last_name) {
          return `${user.first_name} ${user.last_name}`;
        }
        if (user.name) {
          return user.name;
        }
        if (user.email) {
          return user.email.split('@')[0]; // Use email prefix as fallback
        }
      }
    } catch (error) {
      console.error('Error parsing stored user data:', error);
    }

    return "User"; // Final fallback
  };

  // Load user profile on component mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);

        // Try to get user data from localStorage first (from login) for immediate display
        const storedUser = localStorage.getItem('vah_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setUserProfile(user);
        }

        // Fetch fresh user profile from API
        const token = localStorage.getItem('vah_jwt');
        if (token) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';
          const response = await fetch(`${apiUrl}/api/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.ok && data.data) {
              setUserProfile(data.data);
              // Update localStorage with fresh data
              localStorage.setItem('vah_user', JSON.stringify(data.data));
            }
          } else {
            console.warn('Failed to fetch user profile, using stored data');
          }
        }

      } catch (error) {
        console.error('Error loading user profile:', error);
        // Continue with stored data if API fails
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  // Select/Deselect functions
  const toggleSelectMail = (id: string) => {
    setSelectedMail(prev =>
      prev.includes(id)
        ? prev.filter(mailId => mailId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMail.length === mockMailItems.length) {
      setSelectedMail([]);
    } else {
      setSelectedMail(mockMailItems.map(item => item.id));
    }
  };

  const isAllSelected = selectedMail.length === mockMailItems.length && mockMailItems.length > 0;
  const isSomeSelected = selectedMail.length > 0;

  // Check if selected items include HMRC or Companies House
  const selectedHasGovernment = selectedMail.some(id => {
    const item = mockMailItems.find(m => m.id === id);
    return item?.category === "HMRC" || item?.category === "Companies House";
  });

  // Download functions
  const downloadSingle = async (mailId: string) => {
    try {
      const token = localStorage.getItem('vah_jwt');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';
      
      const response = await fetch(`${apiUrl}/api/mail-items/${mailId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mail_scan_${mailId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download mail scan');
      }
    } catch (error) {
      console.error('Error downloading mail scan:', error);
    }
  };

  const downloadSelected = async () => {
    if (selectedMail.length === 0) return;
    
    try {
      const token = localStorage.getItem('vah_jwt');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';
      
      if (selectedMail.length === 1) {
        // Single item - download as PDF directly
        await downloadSingle(selectedMail[0]);
      } else {
        // Multiple items - download as ZIP
        const response = await fetch(`${apiUrl}/api/mail-items/bulk-download`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ mail_ids: selectedMail })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.data.download_url) {
            // Open download URL
            window.open(data.data.download_url, '_blank');
          }
        } else {
          console.error('Failed to download selected mail scans');
        }
      }
    } catch (error) {
      console.error('Error downloading selected mail scans:', error);
    }
  };

  // Show loading state while fetching user data
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container-responsive flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <VAHLogo size="md" />
            <span className="hidden sm:inline-block text-muted-foreground">|</span>
            <span className="hidden sm:inline-block font-medium">Dashboard</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard-profile')}>
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard-settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </nav>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-card">
            <nav className="container-responsive py-4 flex flex-col gap-2">
              <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard-profile')} className="justify-start">
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard-settings')} className="justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Separator className="my-2" />
              <Button variant="ghost" size="sm" onClick={onLogout} className="justify-start">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container-responsive py-8">

        {/* Welcome Message */}
        <div className="mb-8">
          <h1 className="mb-2">
            {loading ? (
              "Welcome back..."
            ) : (
              `Welcome back, ${getUserName()}`
            )}
          </h1>
          <p className="text-muted-foreground">Manage your mail and business address</p>
        </div>

        {/* Two Column Layout: Main content + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

          {/* Left Column - Main Content */}
          <div className="space-y-6">

            {/* Mail Inbox Section */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <CardTitle>Mail Inbox</CardTitle>
                    <Badge variant="secondary">{mockMailItems.length} items</Badge>
                  </div>

                  {/* Bulk Actions - Show when items selected */}
                  {isSomeSelected && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default" className="text-sm">
                        {selectedMail.length} selected
                      </Badge>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={downloadSelected}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Selected
                  </Button>
                      <Button size="sm" variant="default">
                        <Truck className="h-4 w-4 mr-2" />
                        Request Forwarding
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">

                {/* Select All - Desktop */}
                <div className="hidden sm:block px-6 py-3 border-b bg-muted/30">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {isAllSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>

                {/* Select All - Mobile */}
                <div className="sm:hidden px-4 py-3 border-b bg-muted/30">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="w-full"
                  >
                    {isAllSelected ? (
                      <>
                        <CheckSquare className="h-4 w-4 mr-2 text-primary" />
                        Deselect All ({mockMailItems.length})
                      </>
                    ) : (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        Select All ({mockMailItems.length})
                      </>
                    )}
                  </Button>
                </div>

                {/* Mail Items List - Desktop */}
                <div className="hidden sm:block">
                  <div className="divide-y">
                    {mockMailItems.map((item) => {
                      const isSelected = selectedMail.includes(item.id);
                      const isGovernment = item.category === "HMRC" || item.category === "Companies House";

                      return (
                        <div
                          key={item.id}
                          className={`px-6 py-4 hover:bg-muted/30 transition-colors ${isSelected ? "bg-primary/5" : ""
                            }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleSelectMail(item.id)}
                              className="mt-1 flex-shrink-0"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-5 w-5 text-primary" />
                              ) : (
                                <Square className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                              )}
                            </button>

                            {/* Mail Info */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium truncate">{item.sender}</h4>
                                    {item.status === "unread" && (
                                      <Badge variant="default" className="text-xs">New</Badge>
                                    )}
                                    {isGovernment && (
                                      <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                        Free Forwarding
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {item.description}
                                  </p>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(item.receivedDate).toLocaleDateString('en-GB', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </p>
                                  <Badge variant="secondary" className="mt-1 text-xs">
                                    {item.category}
                                  </Badge>
                                </div>
                              </div>

                          {/* Individual Actions */}
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => downloadSingle(item.id)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download Scan
                            </Button>
                            <Button size="sm" variant="default">
                              <Truck className="h-3 w-3 mr-1" />
                              Request Forwarding
                            </Button>
                          </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mail Items List - Mobile */}
                <div className="sm:hidden divide-y">
                  {mockMailItems.map((item) => {
                    const isSelected = selectedMail.includes(item.id);
                    const isGovernment = item.category === "HMRC" || item.category === "Companies House";

                    return (
                      <div
                        key={item.id}
                        className={`p-4 ${isSelected ? "bg-primary/5" : ""}`}
                      >
                        <div className="space-y-3">
                          {/* Header with checkbox */}
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => toggleSelectMail(item.id)}
                              className="mt-1 flex-shrink-0"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-5 w-5 text-primary" />
                              ) : (
                                <Square className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium break-words mb-1">{item.sender}</h4>
                                  <p className="text-sm text-muted-foreground break-words">
                                    {item.description}
                                  </p>
                                </div>
                                {item.status === "unread" && (
                                  <Badge variant="default" className="text-xs flex-shrink-0">
                                    New
                                  </Badge>
                                )}
                              </div>

                              {/* Badges */}
                              <div className="flex flex-wrap gap-2 mb-3">
                                <Badge variant="secondary" className="text-xs">
                                  {item.category}
                                </Badge>
                                {isGovernment && (
                                  <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                    Free Forwarding
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.receivedDate).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>

                          {/* Actions */}
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full h-9"
                              onClick={() => downloadSingle(item.id)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                            <Button size="sm" variant="default" className="w-full h-9">
                              <Truck className="h-3 w-3 mr-1" />
                              Forward
                            </Button>
                          </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Empty State */}
                {mockMailItems.length === 0 && (
                  <div className="px-6 py-12 text-center">
                    <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-2">No mail yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Your mail will appear here when it arrives at your virtual address
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Free Forwarding Notice */}
            <Alert className="border-primary/30 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription>
                <strong className="text-foreground">Free Forwarding:</strong> All mail from HMRC and Companies House is forwarded to you at no extra charge. Select these items and use "Request Forwarding" to process them.
              </AlertDescription>
            </Alert>

            {/* Bulk Actions Notice - Mobile */}
            {isSomeSelected && (
              <Card className="sm:hidden border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <span className="font-medium">{selectedMail.length} items selected</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedMail([])}>
                      Clear
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Button 
                      size="default" 
                      variant="outline" 
                      className="w-full h-10"
                      onClick={downloadSelected}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Selected ({selectedMail.length})
                    </Button>
                    <Button size="default" variant="default" className="w-full h-10">
                      <Truck className="h-4 w-4 mr-2" />
                      Request Forwarding ({selectedMail.length})
                    </Button>
                  </div>

                  {selectedHasGovernment && (
                    <p className="text-xs text-muted-foreground mt-3">
                      ✓ Free forwarding available for HMRC/Companies House items
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Help Text */}
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-muted-foreground">
                Need help? Visit our <button onClick={() => onNavigate('help')} className="text-primary hover:underline">Help Center</button> or <button onClick={() => onNavigate('dashboard-support')} className="text-primary hover:underline">Contact Support</button>
              </p>
            </div>
          </div>

          {/* Right Column - Virtual Address Sidebar */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card className="border-0">
              <CardHeader className="pb-3 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm truncate">Your Virtual Business Address</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                {/* Address Display */}
                <div className="bg-muted/50 rounded-lg p-2.5 space-y-0.5">
                  <p className="text-xs font-medium">{virtualAddress.line1}</p>
                  <p className="text-xs font-medium">{virtualAddress.line2}</p>
                  <p className="text-xs font-medium">{virtualAddress.city}</p>
                  <p className="text-xs font-medium">{virtualAddress.postcode}</p>
                  <p className="text-xs font-medium">{virtualAddress.country}</p>
                </div>

                {/* Generate Certificate Button */}
                <div className="space-y-1.5">
                  <Button className="w-full" size="sm">
                    <FileCheck className="h-3.5 w-3.5 mr-1.5" />
                    Generate Certificate
                  </Button>
                  <p className="text-xs text-muted-foreground text-center leading-tight">
                    Official proof of address
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>

        </div>
      </main>
    </div>
  );
}