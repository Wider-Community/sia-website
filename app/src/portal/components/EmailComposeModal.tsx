import { useState } from "react";
import { useCreate } from "@refinedev/core";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "./AnimatedButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { sendEmail } from "../lib/email";

interface EmailComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTo?: string;
  organizationId?: string;
  organizationName?: string;
}

export function EmailComposeModal({
  open,
  onOpenChange,
  defaultTo = "",
  organizationId,
  organizationName,
}: EmailComposeModalProps) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const { mutate: createEvent } = useCreate();

  const handleSend = async () => {
    if (!to || !subject) return;
    setSending(true);

    try {
      // Send the actual email via Resend
      await sendEmail({
        to,
        subject,
        html: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1C1C1E;">
          <div style="border-bottom: 2px solid #C8A951; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: 700; margin: 0;">SIA Platform</h1>
          </div>
          <p style="white-space: pre-wrap;">${body}</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
          <p style="font-size: 12px; color: #9CA3AF;">Sent via SIA Platform</p>
        </div>`,
      });

      // Log the activity event
      createEvent({
        resource: "activity-events",
        values: {
          action: "email_sent",
          entityType: "organization",
          entityId: organizationId ?? "",
          entityName: organizationName ?? to,
          details: { to, subject, body },
          performedBy: "user-1",
          organizationId,
        },
      });

      toast.success(`Email sent to ${to}`);
      setSending(false);
      setTo(defaultTo);
      setSubject("");
      setBody("");
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to send email");
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-to">To</Label>
            <Input
              id="email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-body">Message</Label>
            <Textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Write your message..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <AnimatedButton onClick={handleSend} disabled={!to || !subject} loading={sending}>
            <Send className="mr-2 h-4 w-4" />
            Send
          </AnimatedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
