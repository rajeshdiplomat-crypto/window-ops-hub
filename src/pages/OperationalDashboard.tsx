import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Calendar as CalendarIcon,
    TrendingUp,
    AlertTriangle,
    ClipboardCheck,
    Package,
    Truck,
    DollarSign,
    Maximize2,
    Settings,
    ArrowUpRight,
    Clock,
    LayoutDashboard
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from "date-fns";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend
} from "recharts";

type TimeHorizon = "daily" | "weekly" | "monthly" | "all";

interface KPIStats {
    // Business
    totalProjects: number;
    totalOrders: number;
    totalRetailOrders: number;
    totalWindowOrders: number;
    totalOrderValue: number;
    totalSoldValue: number;
    activeOrders: number;
    completedOrders: number;

    // Survey
    windowsPendingSurvey: number;
    windowsSurveyed: number;
    surveyCompletionRate: number;
    ordersAwaitingSurvey: number;
    surveyActivity: number;

    // Design
    windowsPendingDesign: number;
    windowsReleased: number;
    designCompletionRate: number;
    ordersAwaitingDesign: number;
    designActivity: number;

    // Production
    cuttingCompleted: number;
    assemblyCompleted: number;
    glazingCompleted: number;
    qualityPassed: number;
    windowsPacked: number;
    productionBacklog: number;
    productionActivity: number;

    // Dispatch
    windowsReadyForDispatch: number;
    windowsDispatched: number;
    dispatchCompletionRate: number;
    ordersReadyForDispatch: number;
    dispatchActivity: number;

    // Finance
    pendingProductionApprovals: number;
    pendingDispatchApprovals: number;
    paymentsReceived: number;
    outstandingBalance: number;

    // Rework
    totalReworkCases: number;
    windowsUnderRework: number;
    reworkCompleted: number;
    reworkPending: number;
    reworkByCost: Record<string, number>;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6366f1"];

export default function OperationalDashboard() {
    const [horizon, setHorizon] = useState<TimeHorizon>("weekly");
    const [stats, setStats] = useState<KPIStats | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, [horizon]);

    const fetchData = async () => {
        setLoading(true);
        const now = new Date();
        let start: Date | null = null;
        let end: Date | null = endOfDay(now);

        if (horizon === "daily") {
            start = startOfDay(now);
        } else if (horizon === "weekly") {
            start = startOfWeek(now, { weekStartsOn: 1 });
        } else if (horizon === "monthly") {
            start = startOfMonth(now);
        }

        const [
            ordersRes,
            prodLogsRes,
            dispLogsRes,
            payLogsRes,
            rewLogsRes,
            actLogsRes
        ] = await Promise.all([
            supabase.from("orders").select("*"),
            supabase.from("production_logs").select("*"),
            supabase.from("dispatch_logs").select("*"),
            supabase.from("payment_logs").select("*"),
            supabase.from("rework_logs").select("*"),
            supabase.from("order_activity_log" as any).select("*")
        ]);

        const orders = ordersRes.data || [];
        const prodLogs = prodLogsRes.data || [];
        const dispLogs = dispLogsRes.data || [];
        const payLogs = payLogsRes.data || [];
        const rewLogs = rewLogsRes.data || [];
        const actLogs = actLogsRes.data || [];

        const filterByHorizon = (logs: any[], dateField = "timestamp") => {
            if (horizon === "all" || !start) return logs;
            return logs.filter(l => {
                const d = parseISO(l[dateField] || l.created_at);
                return isWithinInterval(d, { start, end });
            });
        };

        const horizProd = filterByHorizon(prodLogs, "timestamp");
        const horizDisp = filterByHorizon(dispLogs, "timestamp");
        const horizPay = filterByHorizon(payLogs, "created_at");
        const horizRew = filterByHorizon(rewLogs, "created_at");
        const horizAct = filterByHorizon(actLogs, "timestamp");

        // Pipeline Summaries (Static snapshot)
        const packedMap: Record<string, number> = {};
        prodLogs.forEach(l => { if (l.stage === "Packed") packedMap[l.order_id] = (packedMap[l.order_id] || 0) + (l.windows_completed || 0); });

        const dispMap: Record<string, number> = {};
        dispLogs.forEach(l => { dispMap[l.order_id] = (dispMap[l.order_id] || 0) + (l.windows_dispatched || 0); });

        const totalOrders = orders.length;
        const completedOrders = orders.filter(o => {
            const disp = dispMap[o.id] || 0;
            return disp >= o.total_windows && o.total_windows > 0;
        }).length;

        // Rework aggregation
        const reworkByCost: Record<string, number> = {};
        rewLogs.forEach(r => {
            const cat = r.category || "Uncategorized";
            reworkByCost[cat] = (reworkByCost[cat] || 0) + 1;
        });

        const newStats: KPIStats = {
            totalProjects: new Set(orders.map(o => o.order_name.split("-")[0].trim())).size,
            totalOrders,
            totalRetailOrders: orders.filter(o => o.order_type === "Retail").length,
            totalWindowOrders: orders.reduce((s, o) => s + (o.total_windows || 0), 0),
            totalOrderValue: orders.reduce((s, o) => s + Number(o.order_value || 0), 0),
            totalSoldValue: orders.filter(o => o.commercial_status === "Approved").reduce((s, o) => s + Number(o.order_value || 0), 0),
            activeOrders: totalOrders - completedOrders,
            completedOrders,

            windowsPendingSurvey: orders.reduce((s, o) => s + (o.total_windows - (o.survey_done_windows || 0)), 0),
            windowsSurveyed: orders.reduce((s, o) => s + (o.survey_done_windows || 0), 0),
            surveyCompletionRate: orders.length ? Math.round((orders.reduce((s, o) => s + (o.survey_done_windows || 0), 0) / orders.reduce((s, o) => s + (o.total_windows || 0), 0)) * 100) : 0,
            ordersAwaitingSurvey: orders.filter(o => (o.survey_done_windows || 0) === 0).length,
            surveyActivity: horizAct.filter(l => l.module === "Survey" && l.field_name === "survey_done_windows").length,

            windowsPendingDesign: orders.reduce((s, o) => s + (o.survey_done_windows - (o.design_released_windows || 0)), 0),
            windowsReleased: orders.reduce((s, o) => s + (o.design_released_windows || 0), 0),
            designCompletionRate: orders.reduce((s, o) => s + (o.survey_done_windows || 0), 0) ? Math.round((orders.reduce((s, o) => s + (o.design_released_windows || 0), 0) / orders.reduce((s, o) => s + (o.survey_done_windows || 0), 0)) * 100) : 0,
            ordersAwaitingDesign: orders.filter(o => o.survey_done_windows > 0 && (o.design_released_windows || 0) === 0).length,
            designActivity: horizAct.filter(l => l.module === "Design" && l.field_name === "design_released_windows").length,

            cuttingCompleted: horizProd.filter(l => l.stage === "Cutting").reduce((s, l) => s + (l.windows_completed || 0), 0),
            assemblyCompleted: horizProd.filter(l => l.stage === "Assembly").reduce((s, l) => s + (l.windows_completed || 0), 0),
            glazingCompleted: horizProd.filter(l => l.stage === "Glazing").reduce((s, l) => s + (l.windows_completed || 0), 0),
            qualityPassed: horizProd.filter(l => l.stage === "Quality").reduce((s, l) => s + (l.windows_completed || 0), 0),
            windowsPacked: horizProd.filter(l => l.stage === "Packed").reduce((s, l) => s + (l.windows_completed || 0), 0),
            productionBacklog: orders.filter(o => o.approval_for_production === "Approved").reduce((s, o) => s + (o.design_released_windows - (packedMap[o.id] || 0)), 0),
            productionActivity: horizProd.reduce((s, l) => s + (l.windows_completed || 0), 0),

            windowsReadyForDispatch: orders.reduce((s, o) => s + ((packedMap[o.id] || 0) - (dispMap[o.id] || 0)), 0),
            windowsDispatched: orders.reduce((s, o) => s + (dispMap[o.id] || 0), 0),
            dispatchCompletionRate: orders.reduce((s, o) => s + (packedMap[o.id] || 0), 0) ? Math.round((orders.reduce((s, o) => s + (dispMap[o.id] || 0), 0) / orders.reduce((s, o) => s + (packedMap[o.id] || 0), 0)) * 100) : 0,
            ordersReadyForDispatch: orders.filter(o => (packedMap[o.id] || 0) > 0 && (dispMap[o.id] || 0) < (packedMap[o.id] || 0)).length,
            dispatchActivity: horizDisp.reduce((s, l) => s + (l.windows_dispatched || 0), 0),

            pendingProductionApprovals: orders.filter(o => o.approval_for_production !== "Approved" && o.design_released_windows > 0).length,
            pendingDispatchApprovals: orders.filter(o => o.approval_for_dispatch !== "Approved" && (packedMap[o.id] || 0) > 0).length,
            paymentsReceived: horizPay.filter(l => l.status === "Confirmed").reduce((s, l) => s + Number(l.amount || 0), 0),
            outstandingBalance: orders.reduce((s, o) => s + Number(o.balance_amount || 0), 0),

            totalReworkCases: rewLogs.length,
            windowsUnderRework: rewLogs.filter(r => r.status !== "Solved").reduce((s, r) => s + (r.rework_qty || 0), 0),
            reworkCompleted: horizRew.filter(r => r.status === "Solved").reduce((s, r) => s + (r.rework_qty || 0), 0),
            reworkPending: rewLogs.filter(r => r.status !== "Solved").length,
            reworkByCost
        };

        setStats(newStats);
        setLoading(false);
    };

    if (loading || !stats) {
        return (
            <div className="flex flex-col h-[80vh] items-center justify-center gap-4">
                <Clock className="h-10 w-10 text-primary animate-spin-slow" />
                <p className="text-muted-foreground animate-pulse font-medium">Aggregating Operational Excellence...</p>
            </div>
        );
    }

    const KPICard = ({ title, value, subValue, icon: Icon, color, onClick, variant = "default" }: any) => (
        <Card className="overflow-hidden hover:shadow-md transition-all cursor-pointer group border-l-4" style={{ borderLeftColor: color }} onClick={onClick}>
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                    <div className="rounded-lg p-2 bg-muted group-hover:bg-primary/10 transition-colors">
                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-all opacity-0 group-hover:opacity-100" />
                </div>
                <div>
                    <p className="text-2xl font-bold tracking-tight">{value}</p>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">{title}</p>
                    {subValue !== undefined && (
                        <p className="text-xs text-muted-foreground mt-2 font-semibold flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                            {subValue}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    const SectionHeader = ({ title, icon: Icon }: any) => (
        <div className="flex items-center gap-2 mb-4 mt-8 first:mt-0">
            <div className="h-8 w-1 bg-primary rounded-full" />
            <Icon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        </div>
    );

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Operations Hub</h1>
                    <p className="text-slate-500 font-medium">Full visibility across the Window Ops ecosystem</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border shadow-sm">
                    {(["daily", "weekly", "monthly", "all"] as TimeHorizon[]).map((t) => (
                        <Button
                            key={t}
                            variant={horizon === t ? "default" : "ghost"}
                            size="sm"
                            className="capitalize h-8 px-4 text-xs font-bold"
                            onClick={() => setHorizon(t)}
                        >
                            {t}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="space-y-12">
                {/* Alerts Section (Bottlenecks) */}
                {(stats.productionBacklog > 50 || stats.reworkPending > 5 || stats.pendingProductionApprovals > 3) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                        <div className="bg-amber-100 p-3 rounded-xl">
                            <AlertTriangle className="h-6 w-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-amber-900 font-bold mb-1">Operational Alerts Identified</h3>
                            <p className="text-amber-800/80 text-sm font-medium">The system has detected potential bottlenecks that require attention.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {stats.productionBacklog > 50 && <Badge variant="outline" className="bg-white text-amber-700 border-amber-200 font-bold">Prod Backlog high ({stats.productionBacklog} windows)</Badge>}
                            {stats.reworkPending > 0 && <Badge variant="outline" className="bg-white text-red-600 border-red-100 font-bold">{stats.reworkPending} Pending Reworks</Badge>}
                            {stats.pendingProductionApprovals > 0 && <Badge variant="outline" className="bg-white text-amber-700 border-amber-200 font-bold">{stats.pendingProductionApprovals} Approvals Pending</Badge>}
                        </div>
                    </div>
                )}

                {/* Global Business KPIs */}
                <section>
                    <SectionHeader title="Business Intelligence" icon={LayoutDashboard} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard title="Total Orders" value={stats.totalOrders} subValue={`${stats.totalProjects} Projects`} icon={Package} color="#3b82f6" onClick={() => navigate("/orders")} />
                        <KPICard title="Active Pipeline" value={stats.activeOrders} subValue={`${stats.totalWindowOrders} Windows`} icon={TrendingUp} color="#10b981" onClick={() => navigate("/orders")} />
                        <KPICard title="Total Sold Value" value={`₹${(stats.totalSoldValue / 100000).toFixed(1)}L`} subValue={`Full: ₹${(stats.totalOrderValue / 100000).toFixed(1)}L`} icon={DollarSign} color="#8b5cf6" onClick={() => navigate("/orders")} />
                        <KPICard title="Completed" value={stats.completedOrders} subValue={`${Math.round((stats.completedOrders / stats.totalOrders) * 100)}% Success Rate`} icon={ClipboardCheck} color="#059669" onClick={() => navigate("/orders")} />
                    </div>
                </section>

                {/* Operational Modules */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-12">
                        <section>
                            <SectionHeader title="Site Survey & Design Readiness" icon={Maximize2} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Card className="hover:shadow-lg transition-all border-none shadow-sm ring-1 ring-slate-200">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold flex items-center justify-between">
                                            SURVEY PROGRESS
                                            <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100">{stats.surveyCompletionRate}%</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4">
                                        <div onClick={() => navigate("/survey")} className="cursor-pointer">
                                            <p className="text-2xl font-bold">{stats.windowsPendingSurvey}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Windows Pending</p>
                                        </div>
                                        <div onClick={() => navigate("/survey")} className="cursor-pointer">
                                            <p className="text-2xl font-bold text-blue-600">{stats.surveyActivity}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Work Done ({horizon})</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="hover:shadow-lg transition-all border-none shadow-sm ring-1 ring-slate-200">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold flex items-center justify-between">
                                            DESIGN RELEASE
                                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-emerald-100">{stats.designCompletionRate}%</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4">
                                        <div onClick={() => navigate("/design")} className="cursor-pointer">
                                            <p className="text-2xl font-bold">{stats.windowsPendingDesign}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Windows Pending</p>
                                        </div>
                                        <div onClick={() => navigate("/design")} className="cursor-pointer">
                                            <p className="text-2xl font-bold text-emerald-600">{stats.designActivity}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Released ({horizon})</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </section>

                        <section>
                            <SectionHeader title="Production Stages & Output" icon={Settings} />
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                <KPICard title="Cutting" value={stats.cuttingCompleted} icon={TrendingUp} color="#3b82f6" onClick={() => navigate("/production")} />
                                <KPICard title="Assembly" value={stats.assemblyCompleted} icon={TrendingUp} color="#6366f1" onClick={() => navigate("/production")} />
                                <KPICard title="Glazing" value={stats.glazingCompleted} icon={TrendingUp} color="#8b5cf6" onClick={() => navigate("/production")} />
                                <KPICard title="Quality" value={stats.qualityPassed} icon={TrendingUp} color="#10b981" onClick={() => navigate("/production")} />
                                <KPICard title="Packed" value={stats.windowsPacked} icon={Package} color="#22c55e" onClick={() => navigate("/production")} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <Card className="bg-primary/5 border-primary/10 shadow-none">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-primary">Production Backlog</p>
                                            <p className="text-xs text-primary/70">Windows released but not yet packed</p>
                                        </div>
                                        <p className="text-2xl font-black text-primary">{stats.productionBacklog}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-blue-600 text-white border-none shadow-md">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold">Total Productivity</p>
                                            <p className="text-xs opacity-70">Log entries processed this {horizon}</p>
                                        </div>
                                        <p className="text-2xl font-black">{stats.productionActivity}</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </section>

                        <section>
                            <SectionHeader title="Dispatch & Logistics" icon={Truck} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <KPICard title="Ready" value={stats.windowsReadyForDispatch} subValue={`${stats.ordersReadyForDispatch} Orders`} icon={Package} color="#f59e0b" onClick={() => navigate("/dispatch")} />
                                <KPICard title="Dispatched" value={stats.windowsDispatched} subValue={`${stats.dispatchCompletionRate}% Rate`} icon={Truck} color="#3b82f6" onClick={() => navigate("/dispatch")} />
                                <KPICard title="Activity" value={stats.dispatchActivity} subValue={`Windows sent (${horizon})`} icon={TrendingUp} color="#06b6d4" onClick={() => navigate("/dispatch")} />
                            </div>
                        </section>
                    </div>

                    <div className="space-y-8">
                        <section>
                            <SectionHeader title="Finance & Approvals" icon={DollarSign} />
                            <div className="space-y-4">
                                <Card className="border-none shadow-sm ring-1 ring-slate-200">
                                    <CardContent className="p-5 space-y-4">
                                        <div className="flex justify-between items-center group cursor-pointer" onClick={() => navigate("/finance")}>
                                            <div>
                                                <p className="text-xs font-bold text-muted-foreground uppercase">Prod Approvals</p>
                                                <p className="text-xl font-bold">{stats.pendingProductionApprovals}</p>
                                            </div>
                                            <Badge variant="outline" className="group-hover:bg-primary group-hover:text-white transition-colors">Awaiting</Badge>
                                        </div>
                                        <div className="flex justify-between items-center group cursor-pointer" onClick={() => navigate("/finance")}>
                                            <div>
                                                <p className="text-xs font-bold text-muted-foreground uppercase">Disp Approvals</p>
                                                <p className="text-xl font-bold">{stats.pendingDispatchApprovals}</p>
                                            </div>
                                            <Badge variant="outline" className="group-hover:bg-primary group-hover:text-white transition-colors">Awaiting</Badge>
                                        </div>
                                        <div className="pt-4 border-t">
                                            <p className="text-xs font-bold text-muted-foreground uppercase flex justify-between items-center">
                                                Outstanding Balance
                                                <span className="text-red-600">₹{(stats.outstandingBalance / 100000).toFixed(1)}L</span>
                                            </p>
                                            <div className="h-2 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                                                <div className="h-full bg-red-500 rounded-full" style={{ width: '45%' }} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </section>

                        <section>
                            <SectionHeader title="Quality & Rework" icon={AlertTriangle} />
                            <Card className="border-none shadow-sm ring-1 ring-slate-200">
                                <CardContent className="p-5 space-y-6">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-4xl font-black text-slate-800">{stats.reworkPending}</p>
                                            <p className="text-xs font-bold text-muted-foreground uppercase mt-1">Pending Cases</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-800">{stats.windowsUnderRework} Windows</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Under Repair</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-xs font-bold text-muted-foreground uppercase">Rework by Category</p>
                                        {Object.entries(stats.reworkByCost).length > 0 ? (
                                            Object.entries(stats.reworkByCost).map(([cat, count], idx) => (
                                                <div key={cat} className="flex flex-col gap-1">
                                                    <div className="flex justify-between text-xs font-bold">
                                                        <span>{cat}</span>
                                                        <span>{count}</span>
                                                    </div>
                                                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-slate-400" style={{ width: `${(count / stats.totalReworkCases) * 100}%` }} />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">No current rework cases</p>
                                        )}
                                    </div>

                                    <Button variant="outline" className="w-full text-xs font-bold border-2" onClick={() => navigate("/rework")}>
                                        Analyze Issues
                                    </Button>
                                </CardContent>
                            </Card>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
