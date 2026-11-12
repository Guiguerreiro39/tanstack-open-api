import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Copy,
  Info,
  Layers,
  Palette,
  Sparkles,
  Type,
} from "lucide-react";
import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { AppShell } from "@/shared/ui/app-shell";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ButtonGroup } from "@/shared/ui/button-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useAppForm,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Kbd } from "@/shared/ui/kbd";
import { Label } from "@/shared/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Progress } from "@/shared/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import { Slider } from "@/shared/ui/slider";
import { Toaster, toast } from "@/shared/ui/sonner";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

export const Route = createFileRoute("/showcase")({
  component: ShowcasePage,
});

const ShowcaseFeedbackSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.nonEmptyString({ message: () => "Ticket title is required" })),
  priority: Schema.String.pipe(Schema.nonEmptyString({ message: () => "Priority is required" })),
  description: Schema.String.pipe(
    Schema.minLength(10, { message: () => "Description must be at least 10 characters" }),
  ),
});

function ShowcasePage() {
  const [sliderValue, setSliderValue] = React.useState([45]);
  const [switchChecked, setSwitchChecked] = React.useState(true);
  const [checkboxChecked, setCheckboxChecked] = React.useState(true);
  const [submittedValues, setSubmittedValues] = React.useState<string | null>(null);

  const form = useAppForm({
    defaultValues: {
      title: "",
      priority: "medium",
      description: "",
    },
    onSubmit: async ({ value }) => {
      setSubmittedValues(JSON.stringify(value, null, 2));
      toast.success("Form validated and submitted cleanly with Effect Schema!");
    },
  });

  return (
    <AppShell>
      <Toaster position="bottom-right" />
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 px-3 py-1">
              <Sparkles className="text-primary size-3.5" />
              Tailwind CSS v4 & React 19
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              Single-Source OKLCH Tokens
            </Badge>
          </div>
          <h1 className="text-display-lg text-foreground font-display font-bold tracking-tight">
            Design System Showcase
          </h1>
          <p className="text-body-lg text-muted-foreground max-w-3xl">
            Complete interactive gallery of 60+ component primitives, single-source OKLCH theme
            presets, tactile elevations, and Effect Schema form validation.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Colors & Palettes */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="text-primary flex items-center gap-2">
                <Palette className="size-5" />
                <CardTitle>Single-Source OKLCH Color Palette</CardTitle>
              </div>
              <CardDescription>
                Zero arbitrary hex values. Theme tokens dynamically switch between Warm Tactile
                Studio, Editorial Slate, and Neo Brutalist.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-muted-foreground mb-3 text-xs font-bold tracking-wider uppercase">
                  Brand Colors & Containers
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="bg-primary text-primary-foreground shadow-tactile flex h-20 flex-col justify-between rounded-xl p-3 text-xs font-semibold">
                    <span>Primary</span>
                    <span className="font-mono text-[10px] opacity-80">var(--primary)</span>
                  </div>
                  <div className="bg-primary-container text-on-primary-container flex h-20 flex-col justify-between rounded-xl p-3 text-xs font-semibold">
                    <span>Primary Container</span>
                    <span className="font-mono text-[10px] opacity-80">--primary-container</span>
                  </div>
                  <div className="bg-secondary text-secondary-foreground shadow-tactile flex h-20 flex-col justify-between rounded-xl p-3 text-xs font-semibold">
                    <span>Secondary (Sage)</span>
                    <span className="font-mono text-[10px] opacity-80">var(--secondary)</span>
                  </div>
                  <div className="bg-secondary-container text-on-secondary-container flex h-20 flex-col justify-between rounded-xl p-3 text-xs font-semibold">
                    <span>Secondary Cont.</span>
                    <span className="font-mono text-[10px] opacity-80">--sec-container</span>
                  </div>
                  <div className="bg-tertiary text-tertiary-foreground shadow-tactile flex h-20 flex-col justify-between rounded-xl p-3 text-xs font-semibold">
                    <span>Tertiary (Maize)</span>
                    <span className="font-mono text-[10px] opacity-80">var(--tertiary)</span>
                  </div>
                  <div className="bg-tertiary-container text-on-tertiary-container flex h-20 flex-col justify-between rounded-xl p-3 text-xs font-semibold">
                    <span>Tertiary Cont.</span>
                    <span className="font-mono text-[10px] opacity-80">--tert-container</span>
                  </div>
                  <div className="bg-surface-container-high text-foreground border-outline-variant/40 flex h-20 flex-col justify-between rounded-xl border p-3 text-xs font-semibold">
                    <span>Surface High</span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      --surface-high
                    </span>
                  </div>
                  <div className="bg-surface-container-lowest text-foreground border-outline-variant/60 shadow-tactile flex h-20 flex-col justify-between rounded-xl border p-3 text-xs font-semibold">
                    <span>Surface Lowest</span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      --surface-lowest
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-muted-foreground mb-3 text-xs font-bold tracking-wider uppercase">
                  Semantic Status Tokens
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="bg-success-container text-on-success-container flex items-center gap-2 rounded-xl p-3 text-xs font-bold">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>Success</span>
                  </div>
                  <div className="bg-warning-container text-on-warning-container flex items-center gap-2 rounded-xl p-3 text-xs font-bold">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>Warning</span>
                  </div>
                  <div className="bg-info-container text-on-info-container flex items-center gap-2 rounded-xl p-3 text-xs font-bold">
                    <Info className="size-4 shrink-0" />
                    <span>Info</span>
                  </div>
                  <div className="bg-destructive-container text-on-destructive-container flex items-center gap-2 rounded-xl p-3 text-xs font-bold">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>Destructive</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Typography Scale */}
          <Card>
            <CardHeader>
              <div className="text-primary flex items-center gap-2">
                <Type className="size-5" />
                <CardTitle>Typography Scale</CardTitle>
              </div>
              <CardDescription>
                Semantic typography utilities in Quicksand, Plus Jakarta Sans, & JetBrains Mono.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-muted-foreground font-mono text-[10px] uppercase">
                  text-headline-lg
                </span>
                <p className="text-headline-lg leading-tight font-bold">Crafted UI</p>
              </div>
              <div>
                <span className="text-muted-foreground font-mono text-[10px] uppercase">
                  text-headline-md
                </span>
                <p className="text-headline-md font-bold">Tactile Controls</p>
              </div>
              <div>
                <span className="text-muted-foreground font-mono text-[10px] uppercase">
                  text-body-md
                </span>
                <p className="text-body-md text-foreground">
                  Effortless reading rhythm with balanced line heights and high contrast.
                </p>
              </div>
              <div>
                <span className="text-muted-foreground font-mono text-[10px] uppercase">
                  font-mono
                </span>
                <p className="bg-surface-container text-foreground overflow-x-auto rounded-lg p-2 font-mono text-xs">
                  trace-id: 4bf92f3577b34da6a3ce929d0e0e4736
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Core Actions & Tactile Elements */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="text-primary flex items-center gap-2">
                <Layers className="size-5" />
                <CardTitle>Core Actions & Interactive Tactile Elements</CardTitle>
              </div>
              <CardDescription>
                Physical offset elevation utilities that lift on hover and press on click.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="default">Primary CTA</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="outline">Outline Tactile</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="link">Link Style</Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <ButtonGroup>
                  <Button variant="outline" size="sm">
                    Left
                  </Button>
                  <Button variant="outline" size="sm">
                    Middle
                  </Button>
                  <Button variant="outline" size="sm">
                    Right
                  </Button>
                </ButtonGroup>

                <Toggle aria-label="Toggle bookmark" variant="outline">
                  <Bell className="size-4" />
                </Toggle>

                <ToggleGroup type="single" defaultValue="metric">
                  <ToggleGroupItem value="metric">Metric</ToggleGroupItem>
                  <ToggleGroupItem value="imperial">Imperial</ToggleGroupItem>
                </ToggleGroup>

                <div className="flex items-center gap-2">
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                  <span className="text-muted-foreground text-xs">Command Bar</span>
                </div>

                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  <span className="text-muted-foreground text-xs">Live Spinner</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="tertiary">Tertiary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Form Integration with Effect Schema */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Form Integration with Effect Schema Validation</CardTitle>
              <CardDescription>
                Declarative TanStack Form v1 composition with Effect standardSchemaV1 validation and
                accessible field primitives.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
              >
                <form.Field
                  name="title"
                  validators={{
                    onBlur: Schema.standardSchemaV1(ShowcaseFeedbackSchema.fields.title),
                    onSubmit: Schema.standardSchemaV1(ShowcaseFeedbackSchema.fields.title),
                  }}
                >
                  {(field) => (
                    <FormField field={field}>
                      <FormItem>
                        <FormLabel>Ticket Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Implement Sentry SDK Adapter"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>Clear, concise issue summary.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                  )}
                </form.Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <form.Field name="priority">
                    {(field) => (
                      <FormField field={field}>
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select
                            value={field.state.value}
                            onValueChange={(val) => field.handleChange(val)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low Priority</SelectItem>
                              <SelectItem value="medium">Medium Priority</SelectItem>
                              <SelectItem value="high">High Priority</SelectItem>
                              <SelectItem value="critical">Critical Hotfix</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      </FormField>
                    )}
                  </form.Field>

                  <div>
                    <Label
                      htmlFor="showcase-security-code"
                      className="text-foreground mb-2 block text-sm leading-none font-semibold"
                    >
                      Security Code
                    </Label>
                    <Input id="showcase-security-code" placeholder="1234" maxLength={4} />
                  </div>
                </div>

                <form.Field
                  name="description"
                  validators={{
                    onBlur: Schema.standardSchemaV1(ShowcaseFeedbackSchema.fields.description),
                    onSubmit: Schema.standardSchemaV1(ShowcaseFeedbackSchema.fields.description),
                  }}
                >
                  {(field) => (
                    <FormField field={field}>
                      <FormItem>
                        <FormLabel>Ticket Details</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe reproduction steps or architectural context..."
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                  )}
                </form.Field>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="auto-assign"
                        checked={checkboxChecked}
                        onCheckedChange={(checked) => setCheckboxChecked(Boolean(checked))}
                      />
                      <Label htmlFor="auto-assign" className="cursor-pointer text-sm font-medium">
                        Auto-assign issue
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id="notify-team"
                        checked={switchChecked}
                        onCheckedChange={setSwitchChecked}
                      />
                      <Label htmlFor="notify-team" className="cursor-pointer text-sm font-medium">
                        Notify team
                      </Label>
                    </div>
                  </div>

                  <Button type="submit" variant="default">
                    Submit Ticket
                  </Button>
                </div>

                {submittedValues && (
                  <pre className="bg-surface-container text-foreground mt-4 overflow-x-auto rounded-xl p-3 font-mono text-xs">
                    {submittedValues}
                  </pre>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Card 5: Overlays, Modals & Triggers */}
          <Card>
            <CardHeader>
              <CardTitle>Overlays & Modals</CardTitle>
              <CardDescription>
                Accessible modal dialogs, drawers, popovers, and sheets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2.5">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span>Standard Dialog</span>
                      <Sparkles className="text-primary size-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Modal Dialog Primitive</DialogTitle>
                      <DialogDescription>
                        Fully accessible dialog with focus-trap, backdrop-blur, and tactile shadow
                        styling.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="text-foreground py-2 text-sm">
                      This modal is rendered with React 19 props and unified Radix primitives.
                    </div>
                    <DialogFooter>
                      <Button variant="default">Confirm</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-between">
                      <span>Alert Confirmation</span>
                      <AlertCircle className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the resource.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction>Confirm Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span>Slide Sheet Panel</span>
                      <Layers className="size-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <SheetTitle>Slide-Over Sheet</SheetTitle>
                      <SheetDescription>
                        Side-docked inspector panel with tactile shadow.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="text-foreground py-6 text-sm">
                      Inspecting resource metadata and runtime environment configuration.
                    </div>
                  </SheetContent>
                </Sheet>

                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span>Mobile Bottom Drawer</span>
                      <Copy className="size-4" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Bottom Drawer</DrawerTitle>
                      <DrawerDescription>Touch-draggable sheet built with Vaul.</DrawerDescription>
                    </DrawerHeader>
                    <div className="text-foreground p-4 text-center text-sm">
                      Drag downwards or tap background to close.
                    </div>
                    <DrawerFooter>
                      <DrawerClose asChild>
                        <Button variant="outline">Close Drawer</Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        Popover
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <p className="text-foreground mb-1 text-xs font-semibold">Anchored Content</p>
                      <p className="text-muted-foreground text-xs">
                        Floating popovers render smoothly in portals.
                      </p>
                    </PopoverContent>
                  </Popover>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">
                        Hover Tooltip
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Accessible tooltip content</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="pt-2">
                <Label
                  htmlFor="showcase-slider"
                  className="text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase"
                >
                  Range Slider ({sliderValue[0]}%)
                </Label>
                <Slider
                  id="showcase-slider"
                  value={sliderValue}
                  onValueChange={setSliderValue}
                  max={100}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 6: Data Display, Tables & Feedback */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Data Display, Tables & Realtime Feedback</CardTitle>
              <CardDescription>
                Tabular metrics, user avatars, interactive tabs, accordions, and calendar widgets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h4 className="text-muted-foreground mb-3 text-xs font-bold tracking-wider uppercase">
                    Semantic Data Table
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task Name</TableHead>
                        <TableHead>Scope</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-semibold">Setup Better Auth</TableCell>
                        <TableCell>
                          <Badge variant="outline">all</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="success">Completed</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost">
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold">Live SSE Query</TableCell>
                        <TableCell>
                          <Badge variant="outline">own</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="info">In Flight</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost">
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold">XHR File Upload</TableCell>
                        <TableCell>
                          <Badge variant="outline">own</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="warning">Pending</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost">
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <div className="mt-4 flex items-center gap-4">
                    <span className="text-muted-foreground text-xs font-semibold">
                      User Avatars:
                    </span>
                    <div className="flex -space-x-2">
                      <Avatar>
                        <AvatarFallback>SC</AvatarFallback>
                      </Avatar>
                      <Avatar>
                        <AvatarFallback>GG</AvatarFallback>
                      </Avatar>
                      <Avatar>
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="ml-4 flex-1 space-y-1">
                      <div className="text-muted-foreground flex justify-between text-xs">
                        <span>Upload Progress</span>
                        <span>78%</span>
                      </div>
                      <Progress value={78} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-muted-foreground mb-1 text-xs font-bold tracking-wider uppercase">
                    Tabs & Accordion Primitives
                  </h4>
                  <Tabs defaultValue="notifications" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="notifications">Notifications</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent
                      value="notifications"
                      className="bg-surface-container text-foreground rounded-xl p-3 text-xs"
                    >
                      All realtime alerts and SSE task events will stream here.
                    </TabsContent>
                    <TabsContent
                      value="settings"
                      className="bg-surface-container text-foreground rounded-xl p-3 text-xs"
                    >
                      Configure your theme presets and API endpoints.
                    </TabsContent>
                  </Tabs>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>What is Single-Source Architecture?</AccordionTrigger>
                      <AccordionContent>
                        All tokens are defined in Layer 1 of theme.css and bound in Layer 2 via
                        Tailwind v4 @theme inline. Changing one file restyles the entire
                        application.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>
                        How does Effect Schema integrate with forms?
                      </AccordionTrigger>
                      <AccordionContent>
                        TanStack Form v1 natively consumes Standard Schema v1 validators produced by
                        effect/Schema.standardSchemaV1.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast.success("Task completed successfully!")}
                    >
                      Trigger Success Toast
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast.error("Failed to connect to SSE stream.")}
                    >
                      Trigger Error Toast
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
