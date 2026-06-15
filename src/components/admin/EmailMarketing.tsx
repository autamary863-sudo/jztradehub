import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Mail, Send, Users, FileText, Clock, CheckCircle, XCircle, Loader2,
  RefreshCw, Eye, Copy, Plus, BarChart3, Save, Trash2, Edit
} from "lucide-react";

const API_URL = "http://localhost:5000";

interface EmailList {
  id: string;
  name: string;
  description: string;
  list_type: string;
  total_subscribers: number;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  list_id: string;
  recipient_count: number;
  sent_count: number;
  status: string;
  created_at: string;
  sent_at: string;
  email_lists?: { name: string };
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: string;
  is_active: boolean;
}

const EmailMarketing = () => {
  const [lists, setLists] = useState<EmailList[]>([
    {
      id: "1",
      name: "All Buyers",
      description: "All registered buyers on JZTradeHub",
      list_type: "buyers",
      total_subscribers: 0
    },
    {
      id: "2", 
      name: "All Sellers",
      description: "All registered sellers on JZTradeHub",
      list_type: "sellers",
      total_subscribers: 0
    },
    {
      id: "3",
      name: "All Users",
      description: "All registered users on JZTradeHub",
      list_type: "all_users",
      total_subscribers: 0
    }
  ]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("campaigns");
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [showHtmlEditor, setShowHtmlEditor] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [recipientPreview, setRecipientPreview] = useState<{ email: string; name: string }[]>([]);
  const [recipientTotal, setRecipientTotal] = useState(0);
  const [previewListOpen, setPreviewListOpen] = useState(false);
  const [campaignData, setCampaignData] = useState({
    name: "",
    subject: "",
    content: "",
    list_id: "",
  });
  const [templateData, setTemplateData] = useState({
    name: "",
    subject: "",
    content: "",
    type: "custom",
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchEmailLists(),
      fetchCampaigns(),
      fetchTemplates(),
    ]);
    setLoading(false);
  };

  const fetchEmailLists = async () => {
    // Hardcoded lists are already set in useState
    // Try to get real subscriber counts from API
    try {
      const response = await fetch(`${API_URL}/api/admin/email-lists`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.lists && data.lists.length > 0) {
          // Update counts from API
          setLists(prevLists => prevLists.map(list => {
            const apiList = data.lists.find((l: any) => l.list_type === list.list_type);
            if (apiList) {
              return { ...list, total_subscribers: apiList.total_subscribers || 0 };
            }
            return list;
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching lists from API:", error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/email-campaigns`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCampaigns(data.campaigns || []);
        }
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/email-templates`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTemplates(data.templates || []);
        }
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const previewRecipients = async (list: EmailList) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/preview-recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_type: list.list_type })
      });
      const data = await response.json();
      if (data.success) {
        setRecipientPreview(data.samples || []);
        setRecipientTotal(data.total || 0);
        setPreviewListOpen(true);
      }
    } catch (error) {
      console.error("Error fetching recipients:", error);
      toast.error("Failed to load recipients");
    }
  };

  const createCampaign = async () => {
    if (!campaignData.name || !campaignData.subject || !campaignData.content || !campaignData.list_id) {
      toast.error("Please fill all required fields");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/email-campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignData)
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success("Campaign created successfully!");
        setCampaignDialogOpen(false);
        resetCampaignForm();
        fetchCampaigns();
      } else {
        toast.error(data.message || "Failed to create campaign");
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast.error("Failed to create campaign");
    } finally {
      setSending(false);
    }
  };

  const sendCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to send this campaign to all recipients?")) return;
    
    setSending(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/send-email-campaign/${campaignId}`, {
        method: "POST",
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        fetchCampaigns();
      } else {
        toast.error(data.message || "Failed to send campaign");
      }
    } catch (error) {
      console.error("Error sending campaign:", error);
      toast.error("Failed to send campaign");
    } finally {
      setSending(false);
    }
  };

  const createTemplate = async () => {
    if (!templateData.name || !templateData.subject || !templateData.content) {
      toast.error("Please fill all required fields");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/email-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData)
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success("Template created successfully!");
        setTemplateDialogOpen(false);
        resetTemplateForm();
        fetchTemplates();
      } else {
        toast.error(data.message || "Failed to create template");
      }
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template");
    } finally {
      setSending(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/email-template/${templateId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success("Template deleted successfully");
        fetchTemplates();
      } else {
        toast.error(data.message || "Failed to delete template");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const useTemplate = (template: EmailTemplate) => {
    setCampaignData({
      ...campaignData,
      subject: template.subject,
      content: template.content,
    });
    toast.success(`Template "${template.name}" loaded`);
    setCampaignDialogOpen(true);
  };

  const resetCampaignForm = () => {
    setCampaignData({
      name: "",
      subject: "",
      content: "",
      list_id: "",
    });
  };

  const resetTemplateForm = () => {
    setTemplateData({
      name: "",
      subject: "",
      content: "",
      type: "custom",
    });
    setEditingTemplate(null);
  };

  const editTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateData({
      name: template.name,
      subject: template.subject,
      content: template.content,
      type: template.type,
    });
    setTemplateDialogOpen(true);
  };

  const updateTemplate = async () => {
    if (!editingTemplate) return;
    
    setSending(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/email-template/${editingTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData)
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success("Template updated successfully!");
        setTemplateDialogOpen(false);
        resetTemplateForm();
        fetchTemplates();
      } else {
        toast.error(data.message || "Failed to update template");
      }
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Failed to update template");
    } finally {
      setSending(false);
    }
  };

  const previewTemplate = (template: EmailTemplate) => {
    setPreviewSubject(template.subject);
    setPreviewContent(template.content);
    setPreviewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500/10 text-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Sent</Badge>;
      case "sending":
        return <Badge className="bg-blue-500/10 text-blue-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Sending</Badge>;
      case "draft":
        return <Badge className="bg-yellow-500/10 text-yellow-600"><Clock className="w-3 h-3 mr-1" /> Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // HTML Editor toolbar functions
  const insertHtml = (tag: string) => {
    const textarea = document.getElementById("email-content") as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    let insertion = "";
    
    switch (tag) {
      case "bold":
        insertion = "**bold text**";
        break;
      case "italic":
        insertion = "*italic text*";
        break;
      case "link":
        insertion = `<a href="https://">link text</a>`;
        break;
      case "h1":
        insertion = `<h1>Heading 1</h1>`;
        break;
      case "h2":
        insertion = `<h2>Heading 2</h2>`;
        break;
      case "p":
        insertion = `<p>Paragraph text</p>`;
        break;
      case "button":
        insertion = `<a href="{{website}}" class="button" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: 600;">Click Here</a>`;
        break;
      case "image":
        insertion = `<img src="https://" alt="image description" style="max-width: 100%;">`;
        break;
      default:
        return;
    }
    
    const newText = text.substring(0, start) + insertion + text.substring(end);
    setCampaignData({ ...campaignData, content: newText });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertion.length, start + insertion.length);
    }, 10);
  };

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary animate-pulse" />
              </div>
            </div>
            <p className="mt-4 text-muted-foreground">Loading email marketing...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-strong">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Mail className="w-6 h-6 text-primary" />
                Email Marketing
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Send bulk emails to buyers, sellers, or all users
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
                <FileText className="w-4 h-4 mr-2" />
                New Template
              </Button>
              <Button onClick={() => setCampaignDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Email Lists Section */}
          <div className="mb-8">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Email Lists
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {lists.map((list) => (
                <div 
                  key={list.id} 
                  className="p-5 rounded-xl border border-white/10 hover:border-primary/30 transition-all cursor-pointer group"
                  onClick={() => previewRecipients(list)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-lg">{list.name}</h4>
                    <Badge variant="outline" className="capitalize">{list.list_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{list.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-primary">{list.total_subscribers.toLocaleString()}</span>
                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="glass-strong w-full">
              <TabsTrigger value="campaigns" className="flex-1 gap-2">
                <Send className="w-4 h-4" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex-1 gap-2">
                <FileText className="w-4 h-4" />
                Templates
              </TabsTrigger>
            </TabsList>

            {/* Campaigns Tab */}
            <TabsContent value="campaigns">
              {campaigns.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Mail className="w-20 h-20 mx-auto mb-4 opacity-30" />
                  <p className="text-lg mb-2">No campaigns yet</p>
                  <p className="text-sm mb-6">Create your first email campaign to reach your customers</p>
                  <Button size="lg" onClick={() => setCampaignDialogOpen(true)}>
                    <Plus className="w-5 h-5 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Campaign</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>List</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{campaign.subject}</TableCell>
                          <TableCell>{campaign.email_lists?.name || "N/A"}</TableCell>
                          <TableCell>{campaign.recipient_count.toLocaleString()}</TableCell>
                          <TableCell>{campaign.sent_count.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(campaign.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="outline" onClick={() => {
                                setPreviewSubject(campaign.subject);
                                setPreviewContent(campaign.content);
                                setPreviewDialogOpen(true);
                              }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              {campaign.status === "draft" && (
                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => sendCampaign(campaign.id)} disabled={sending}>
                                  <Send className="w-4 h-4 mr-1" />
                                  Send
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates">
              {templates.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FileText className="w-20 h-20 mx-auto mb-4 opacity-30" />
                  <p className="text-lg mb-2">No templates yet</p>
                  <p className="text-sm mb-6">Create email templates to reuse in your campaigns</p>
                  <Button size="lg" onClick={() => setTemplateDialogOpen(true)}>
                    <Plus className="w-5 h-5 mr-2" />
                    Create Template
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {templates.map((template) => (
                    <Card key={template.id} className="border border-white/10 hover:border-primary/30 transition-all group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{template.subject}</p>
                          </div>
                          <Badge className="capitalize">{template.type}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-20 overflow-hidden text-sm text-muted-foreground mb-4">
                          <div dangerouslySetInnerHTML={{ __html: template.content.substring(0, 150) + "..." }} />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => previewTemplate(template)}>
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                          <Button size="sm" className="flex-1" onClick={() => useTemplate(template)}>
                            <Copy className="w-4 h-4 mr-1" />
                            Use
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTemplate(template.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Campaign Dialog */}
      <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
        <DialogContent className="glass-strong max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Create Email Campaign</DialogTitle>
            <DialogDescription>Create and send email campaigns to your subscribers</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input 
                  placeholder="e.g., Summer Sale 2024" 
                  value={campaignData.name} 
                  onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })} 
                />
              </div>

              <div className="space-y-2">
                <Label>Select Email List *</Label>
                <Select value={campaignData.list_id} onValueChange={(v) => setCampaignData({ ...campaignData, list_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a list" />
                  </SelectTrigger>
                  <SelectContent>
                    {lists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name} ({list.total_subscribers.toLocaleString()} subscribers)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email Subject *</Label>
              <Input 
                placeholder="Subject line" 
                value={campaignData.subject} 
                onChange={(e) => setCampaignData({ ...campaignData, subject: e.target.value })} 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <Label>Email Content *</Label>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowHtmlEditor(!showHtmlEditor)}>
                    {showHtmlEditor ? "Preview" : "Edit HTML"}
                  </Button>
                  {showHtmlEditor && (
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant="outline" onClick={() => insertHtml("h1")}>H1</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => insertHtml("h2")}>H2</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => insertHtml("p")}>P</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => insertHtml("bold")}>B</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => insertHtml("italic")}>I</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => insertHtml("link")}>Link</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => insertHtml("button")}>Button</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => insertHtml("image")}>Image</Button>
                    </div>
                  )}
                </div>
              </div>
              
              {showHtmlEditor ? (
                <textarea
                  id="email-content"
                  className="w-full min-h-[400px] p-4 rounded-lg border border-white/10 bg-background font-mono text-sm"
                  value={campaignData.content}
                  onChange={(e) => setCampaignData({ ...campaignData, content: e.target.value })}
                  placeholder="Write your HTML email content here..."
                />
              ) : (
                <div className="min-h-[400px] p-4 rounded-lg border border-white/10 bg-white/5 overflow-auto">
                  <div dangerouslySetInnerHTML={{ __html: campaignData.content }} />
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Available variables: {"{{name}}"} for recipient's name, {"{{website}}"} for site URL
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignDialogOpen(false)}>Cancel</Button>
            <Button onClick={createCampaign} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="glass-strong max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingTemplate ? "Edit Template" : "Create Email Template"}
            </DialogTitle>
            <DialogDescription>Create reusable email templates for your campaigns</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input 
                  placeholder="e.g., Welcome Email" 
                  value={templateData.name} 
                  onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Template Type</Label>
                <Select value={templateData.type} onValueChange={(v) => setTemplateData({ ...templateData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject Line *</Label>
              <Input 
                placeholder="Email subject" 
                value={templateData.subject} 
                onChange={(e) => setTemplateData({ ...templateData, subject: e.target.value })} 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Email Content *</Label>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => insertHtml("h1")}>H1</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => insertHtml("h2")}>H2</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => insertHtml("p")}>P</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => insertHtml("button")}>Button</Button>
                </div>
              </div>
              <textarea
                className="w-full min-h-[400px] p-4 rounded-lg border border-white/10 bg-background font-mono text-sm"
                value={templateData.content}
                onChange={(e) => setTemplateData({ ...templateData, content: e.target.value })}
                placeholder="Write your HTML email template here..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={editingTemplate ? updateTemplate : createTemplate} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editingTemplate ? "Update Template" : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="glass-strong max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Email Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-sm font-semibold">Subject: {previewSubject}</p>
            </div>
            <div className="border rounded-lg p-6 bg-white">
              <div dangerouslySetInnerHTML={{ __html: previewContent }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recipients Preview Dialog */}
      <Dialog open={previewListOpen} onOpenChange={setPreviewListOpen}>
        <DialogContent className="glass-strong max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Recipients Preview</DialogTitle>
            <DialogDescription>Total recipients: {recipientTotal.toLocaleString()}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recipientPreview.map((recipient, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium">{recipient.name}</p>
                <p className="text-sm text-muted-foreground">{recipient.email}</p>
              </div>
            ))}
            {recipientPreview.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No recipients found</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewListOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmailMarketing;