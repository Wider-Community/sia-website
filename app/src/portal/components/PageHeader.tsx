import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  backTo?: string;
  actions?: React.ReactNode;
  subtitle?: React.ReactNode;
}

export function PageHeader({ title, backTo, actions, subtitle }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      className="flex items-center justify-between"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-4">
        {backTo && (
          <Button variant="ghost" size="icon" onClick={() => navigate(backTo)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  );
}
