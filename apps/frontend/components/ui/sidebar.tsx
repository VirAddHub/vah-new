"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Sheet, SheetContent } from "./sheet"

const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContext = {
    state: "expanded" | "collapsed"
    open: boolean
    setOpen: (open: boolean) => void
    openMobile: boolean
    setOpenMobile: (open: boolean) => void
    isMobile: boolean
    toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContext | null>(null)

function useSidebar() {
    const context = React.useContext(SidebarContext)
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider")
    }

    return context
}

const SidebarProvider = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<"div"> & {
        defaultOpen?: boolean
        open?: boolean
        onOpenChange?: (open: boolean) => void
    }
>(({ defaultOpen = true, open, onOpenChange, className, style, ...props }, ref) => {
    const [openMobile, setOpenMobile] = React.useState(false)
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768

    const state = (open ?? defaultOpen) ? "expanded" : "collapsed"

    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setOpenMobile(false)
            }
        }

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    const toggleSidebar = React.useCallback(() => {
        if (isMobile) {
            setOpenMobile((open) => !open)
        } else {
            onOpenChange?.(!open)
        }
    }, [isMobile, open, onOpenChange])

    return (
        <SidebarContext.Provider
            value={{
                state,
                open: open ?? defaultOpen,
                setOpen: onOpenChange ?? (() => { }),
                openMobile,
                setOpenMobile,
                isMobile,
                toggleSidebar,
            }}
        >
            <div
                ref={ref}
                className={cn(
                    "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
                    className
                )}
                style={
                    {
                        "--sidebar-width": SIDEBAR_WIDTH,
                        "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                        ...style,
                    } as React.CSSProperties
                }
                {...props}
            />
        </SidebarContext.Provider>
    )
})
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<"div"> & {
        variant?: "sidebar" | "floating" | "inset"
        collapsible?: "offcanvas" | "icon" | "none"
    }
>(({ variant = "sidebar", collapsible = "offcanvas", className, ...props }, ref) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

    if (collapsible === "none") {
        return <div ref={ref} className={cn("flex h-full w-[--sidebar-width] flex-col bg-sidebar", className)} {...props} />
    }

  if (isMobile) {
    return (
      <Sheet open={openMobile}>
        <SheetContent
          data-sidebar="sidebar"
          data-mobile="true"
          className="w-[--sidebar-width-mobile] bg-sidebar p-0 [&>button]:hidden"
          style={
            {
              "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          onClick={(e) => {
            // Close sidebar when clicking on the content area
            if (e.target === e.currentTarget) {
              setOpenMobile(false)
            }
          }}
        >
          <div ref={ref} className="flex h-full w-full flex-col" {...props} />
        </SheetContent>
      </Sheet>
    )
  }

    return (
        <div
            ref={ref}
            className={cn(
                "group peer hidden md:flex",
                "data-[collapsible=offcanvas]:hidden",
                "data-[state=collapsed]:hidden",
                "data-[state=expanded]:flex",
                "data-[variant=floating]:absolute data-[variant=floating]:inset-y-2 data-[variant=floating]:z-10 data-[variant=floating]:mx-2 data-[variant=floating]:rounded-lg data-[variant=floating]:border data-[variant=floating]:bg-sidebar data-[variant=floating]:shadow-lg",
                "data-[variant=inset]:inset-y-2 data-[variant=inset]:z-10 data-[variant=inset]:mx-2 data-[variant=inset]:rounded-lg",
                "h-svh w-[--sidebar-width] flex-col bg-sidebar",
                className
            )}
            data-state={state}
            data-collapsible={collapsible}
            data-variant={variant}
            {...props}
        />
    )
})
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef<
    React.ElementRef<typeof Button>,
    React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
    const { toggleSidebar } = useSidebar()

    return (
        <Button
            ref={ref}
            data-sidebar="trigger"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", className)}
            onClick={(event) => {
                onClick?.(event)
                toggleSidebar()
            }}
            {...props}
        >
            <PanelLeft />
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
    )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarRail = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button">>(({ className, ...props }, ref) => {
    const { toggleSidebar } = useSidebar()

    return (
        <button
            ref={ref}
            data-sidebar="rail"
            aria-label="Toggle Sidebar"
            tabIndex={-1}
            onClick={toggleSidebar}
            title="Toggle Sidebar"
            className={cn(
                "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-in-out hover:bg-sidebar-foreground/10 data-[side=left]:right-0 data-[side=right]:left-0 peer-data-[collapsible=offcanvas]:translate-x-0 peer-data-[state=collapsed]:translate-x-0 peer-data-[state=expanded]:translate-x-0 md:flex",
                "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
                "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
                "[[data-side=left][data-state=collapsed]_&]:translate-x-0 [[data-side=right][data-state=collapsed]_&]:translate-x-0",
                "[[data-side=left][data-state=collapsed]_&]:left-auto [[data-side=right][data-state=collapsed]_&]:right-auto",
                "[[data-side=left][data-state=collapsed]_&]:right-0 [[data-side=right][data-state=collapsed]_&]:left-0",
                "[[data-side=left][data-state=collapsed]_&]:translate-x-0 [[data-side=right][data-state=collapsed]_&]:translate-x-0",
                "[[data-side=left][data-state=collapsed]_&]:hover:bg-sidebar-foreground/20 [[data-side=right][data-state=collapsed]_&]:hover:bg-sidebar-foreground/20",
                "[[data-side=left][data-state=collapsed]_&]:data-[state=collapsed]:translate-x-0 [[data-side=right][data-state=collapsed]_&]:data-[state=collapsed]:translate-x-0",
                "[[data-side=left][data-state=collapsed]_&]:data-[state=collapsed]:left-auto [[data-side=right][data-state=collapsed]_&]:data-[state=collapsed]:right-auto",
                "[[data-side=left][data-state=collapsed]_&]:data-[state=collapsed]:right-0 [[data-side=right][data-state=collapsed]_&]:data-[state=collapsed]:left-0",
                "[[data-side=left][data-state=collapsed]_&]:data-[state=collapsed]:translate-x-0 [[data-side=right][data-state=collapsed]_&]:data-[state=collapsed]:translate-x-0",
                "[[data-side=left][data-state=collapsed]_&]:data-[state=collapsed]:hover:bg-sidebar-foreground/20 [[data-side=right][data-state=collapsed]_&]:data-[state=collapsed]:hover:bg-sidebar-foreground/20",
                className
            )}
            {...props}
        />
    )
})
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
    return (
        <main
            ref={ref}
            className={cn(
                "relative flex min-h-svh flex-1 flex-col bg-background",
                "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))]",
                "peer-data-[variant=floating]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=floating]:min-h-[calc(100svh-theme(spacing.4))]",
                className
            )}
            {...props}
        />
    )
})
SidebarInset.displayName = "SidebarInset"

const SidebarInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => {
    return (
        <input
            ref={ref}
            className={cn(
                "h-8 w-full bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        />
    )
})
SidebarInput.displayName = "SidebarInput"

const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
    return <div ref={ref} data-sidebar="header" className={cn("flex flex-col gap-2 p-2", className)} {...props} />
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
    return <div ref={ref} data-sidebar="footer" className={cn("flex flex-col gap-2 p-2", className)} {...props} />
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarSeparator = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
    return <div ref={ref} data-sidebar="separator" className={cn("mx-2 w-full h-px bg-sidebar-foreground/10", className)} {...props} />
})
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
    return <div ref={ref} data-sidebar="content" className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden", className)} {...props} />
})
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
    return <div ref={ref} data-sidebar="group" className={cn("relative flex w-full min-w-0 flex-col p-2", className)} {...props} />
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.ComponentProps<"div"> & { asChild?: boolean }>(({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div"

    return (
        <Comp
            ref={ref}
            data-sidebar="group-label"
            className={cn(
                "duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
                "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
                className
            )}
            {...props}
        />
    )
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupAction = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button"> & { asChild?: boolean }>(({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
        <Comp
            ref={ref}
            data-sidebar="group-action"
            className={cn(
                "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
                // Increases the hit area of the button on mobile.
                "after:absolute after:-inset-2 after:md:hidden",
                "group-data-[collapsible=icon]:hidden",
                className
            )}
            {...props}
        />
    )
})
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
    return <div ref={ref} data-sidebar="group-content" className={cn("w-full text-sm", "group-data-[collapsible=icon]:hidden", className)} {...props} />
})
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(({ className, ...props }, ref) => {
    return <ul ref={ref} data-sidebar="menu" className={cn("flex w-full min-w-0 flex-col gap-1", className)} {...props} />
})
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ className, ...props }, ref) => {
    return <li ref={ref} data-sidebar="menu-item" className={cn("group/menu-item relative", className)} {...props} />
})
SidebarMenuItem.displayName = "SidebarMenuItem"

const sidebarMenuButtonVariants = cva(
    "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                outline:
                    "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
            },
            size: {
                default: "h-8 text-sm",
                sm: "h-7 text-xs",
                lg: "h-12 text-sm group-data-[collapsible=icon]:!size-8",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

const SidebarMenuButton = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<"button"> & {
        asChild?: boolean
        isActive?: boolean
        tooltip?: string | React.ComponentProps<typeof SidebarMenuBadge>
    } & VariantProps<typeof sidebarMenuButtonVariants>
>(({ asChild = false, isActive = false, variant = "default", size = "default", tooltip, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
        <Comp
            ref={ref}
            data-sidebar="menu-button"
            data-size={size}
            data-active={isActive}
            className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
            {...props}
        />
    )
})
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuAction = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<"button"> & {
        asChild?: boolean
        showOnHover?: boolean
    }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
        <Comp
            ref={ref}
            data-sidebar="menu-action"
            className={cn(
                "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
                // Increases the hit area of the button on mobile.
                "after:absolute after:-inset-2 after:md:hidden",
                "peer-data-[size=sm]/menu-button:top-1",
                "peer-data-[size=default]/menu-button:top-1.5",
                "peer-data-[size=lg]/menu-button:top-2.5",
                "group-data-[collapsible=icon]:hidden",
                showOnHover &&
                "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
                className
            )}
            {...props}
        />
    )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
    return (
        <div
            ref={ref}
            data-sidebar="menu-badge"
            className={cn(
                "absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground select-none pointer-events-none",
                "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
                "peer-data-[size=sm]/menu-button:top-1",
                "peer-data-[size=default]/menu-button:top-1.5",
                "peer-data-[size=lg]/menu-button:top-2.5",
                "group-data-[collapsible=icon]:hidden",
                className
            )}
            {...props}
        />
    )
})
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarMenuSkeleton = React.forwardRef<HTMLDivElement, React.ComponentProps<"div"> & { showIcon?: boolean }>(({ className, showIcon = false, ...props }, ref) => {
    // Random width between 50 to 90%.
    const width = React.useMemo(() => {
        return `${Math.floor(Math.random() * 40) + 50}%`
    }, [])

    return (
        <div
            ref={ref}
            data-sidebar="menu-skeleton"
            className={cn("rounded-md h-8 flex gap-2 px-2 items-center", className)}
            {...props}
        >
            {showIcon && (
                <Skeleton
                    className="size-4 rounded-md"
                    data-sidebar="menu-skeleton-icon"
                />
            )}
            <Skeleton
                className="h-4 flex-1 max-w-[--skeleton-width]"
                data-sidebar="menu-skeleton-text"
                style={
                    {
                        "--skeleton-width": width,
                    } as React.CSSProperties
                }
            />
        </div>
    )
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

const SidebarMenuSub = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(({ className, ...props }, ref) => {
    return <ul ref={ref} data-sidebar="menu-sub" className={cn("mx-3.5 flex w-[calc(100%-theme(spacing.7))] min-w-0 flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5", "group-data-[collapsible=icon]:hidden", className)} {...props} />
})
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ ...props }, ref) => {
    return <li ref={ref} {...props} />
})
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef<
    HTMLAnchorElement,
    React.ComponentProps<"a"> & {
        asChild?: boolean
        size?: "sm" | "md"
        isActive?: boolean
    }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "a"

    return (
        <Comp
            ref={ref}
            data-sidebar="menu-sub-button"
            data-size={size}
            data-active={isActive}
            className={cn(
                "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
                "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
                size === "sm" && "text-xs",
                size === "md" && "text-sm",
                "group-data-[collapsible=icon]:hidden",
                className
            )}
            {...props}
        />
    )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

const SidebarMenuSubBadge = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
    return (
        <div
            ref={ref}
            data-sidebar="menu-sub-badge"
            className={cn(
                "ml-auto flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground select-none",
                "group-data-[collapsible=icon]:hidden",
                className
            )}
            {...props}
        />
    )
})
SidebarMenuSubBadge.displayName = "SidebarMenuSubBadge"

// Skeleton component (you might need to import this from your UI library)
const Skeleton = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={cn("animate-pulse rounded-md bg-muted", className)}
            {...props}
        />
    )
})
Skeleton.displayName = "Skeleton"

export {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInput,
    SidebarInset,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton,
    SidebarMenuSub,
    SidebarMenuSubBadge,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar,
}
