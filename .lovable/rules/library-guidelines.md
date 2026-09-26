# SignFlow Documents — Guidelines

## Components

The design system exports these components — import them from `@ws-dd8f753f62b942ae903e/6b73cc70-0820-4dc9-9868-202fd9a12208` and compose them before building anything from scratch:

`AppShell`, `Brand`, `Button`, `CommandDialog`, `CommandEmpty`, `CommandGroup`, `CommandInput`, `CommandItem`, `CommandList`, `CommandSeparator`, `CommandShortcut`, `Command`, `Constants`, `ContractEnvelopeDialog`, `DialogClose`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogOverlay`, `DialogPortal`, `DialogTitle`, `DialogTrigger`, `Dialog`, `DropdownMenuCheckboxItem`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuPortal`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSubContent`, `DropdownMenuSubTrigger`, `DropdownMenuSub`, `DropdownMenuTrigger`, `DropdownMenu`, `FolderTree`, `GlobalSearch`, `Input`, `InstallAppButton`, `Label`, `PdfEditor`, `PdfPreviewError`, `PdfWorkbench`, `PublicPage`, `PublicSiteFooter`, `PublicSiteHeader`, `PublicSiteLayout`, `PublicToolPage`, `PushSetup`, `SelectContent`, `SelectGroup`, `SelectItem`, `SelectLabel`, `SelectScrollDownButton`, `SelectScrollUpButton`, `SelectSeparator`, `SelectTrigger`, `SelectValue`, `Select`, `Separator`, `SheetClose`, `SheetContent`, `SheetDescription`, `SheetFooter`, `SheetHeader`, `SheetOverlay`, `SheetPortal`, `SheetTitle`, `SheetTrigger`, `Sheet`, `SidebarContent`, `SidebarFooter`, `SidebarGroupAction`, `SidebarGroupContent`, `SidebarGroupLabel`, `SidebarGroup`, `SidebarHeader`, `SidebarInput`, `SidebarInset`, `SidebarMenuAction`, `SidebarMenuBadge`, `SidebarMenuButton`, `SidebarMenuItem`, `SidebarMenuSkeleton`, `SidebarMenuSubButton`, `SidebarMenuSubItem`, `SidebarMenuSub`, `SidebarMenu`, `SidebarProvider`, `SidebarRail`, `SidebarSeparator`, `SidebarTrigger`, `Sidebar`, `Skeleton`, `StageBadge`, `StatCard`, `Switch`, `Textarea`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger`, `Tooltip`, `UploadDocumentDialog`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-dd8f753f62b942ae903e/6b73cc70-0820-4dc9-9868-202fd9a12208/styles.css` (source — preferred import)
- `@ws-dd8f753f62b942ae903e/6b73cc70-0820-4dc9-9868-202fd9a12208/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)

