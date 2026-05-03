import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { motion, type Transition } from "framer-motion";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * AnimatedDialogContent
 *
 * A drop-in replacement for DialogContent that uses framer-motion for a
 * scale + fade entrance/exit instead of the default CSS keyframes.
 * Does NOT modify the shadcn base components.
 * -------------------------------------------------------------------------- */

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const contentVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const transition: Transition = { duration: 0.2, ease: [0.16, 1, 0.3, 1] };

// ---- Dialog ---------------------------------------------------------------

export function AnimatedDialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPrimitive.Portal forceMount>
      <DialogPrimitive.Overlay asChild forceMount>
        <motion.div
          className="fixed inset-0 z-50 bg-black/50"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={transition}
        />
      </DialogPrimitive.Overlay>
      <DialogPrimitive.Content asChild forceMount {...props}>
        <motion.div
          className={cn(
            "bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg border p-6 shadow-lg outline-none sm:max-w-lg",
            className
          )}
          style={{ x: "-50%", y: "-50%" }}
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transition}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </motion.div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

// ---- AlertDialog ----------------------------------------------------------

export function AnimatedAlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal forceMount>
      <AlertDialogPrimitive.Overlay asChild forceMount>
        <motion.div
          className="fixed inset-0 z-50 bg-black/50"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={transition}
        />
      </AlertDialogPrimitive.Overlay>
      <AlertDialogPrimitive.Content asChild forceMount {...props}>
        <motion.div
          className={cn(
            "bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg border p-6 shadow-lg outline-none sm:max-w-lg",
            className
          )}
          style={{ x: "-50%", y: "-50%" }}
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transition}
        >
          {children}
        </motion.div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
}
