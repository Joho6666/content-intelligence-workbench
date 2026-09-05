"use client";
import {
  FileText,
  Flame,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Stat, PageHead, Section } from "../../components/shared/legacy";
import { useWorkbench } from "../../hooks/use-workbench";
import { formatCount, formatDate } from "../../lib/utils";

export default function Analytics() {
  const { state } = useWorkbench();
  const totalViews = 0;
  const recentContent = state.content.slice(0, 10).map((item) => ({
    title: item.title,
    platform: item.platform,
    scheduledAt: item.scheduledAt,
    score: 0,
    image: "#dbe7f5",
  }));
  const chart = Array.from({ length: 7 }, (_, index) => ({ d: "第 " + (index + 1) + " 天", v: 0 }));
  const platformCounts = state.content.reduce<Record<string, number>>((counts, item) => {
    counts[item.platform] = (counts[item.platform] || 0) + 1;
    return counts;
  }, {});
  const platform = Object.entries(platformCounts).map(([name, value], index) => ({
    name,
    value,
    color: ["#3978f6", "#ef5a64", "#8b78e8", "#39b984"][index % 4],
  }));
  return (
    <>
      <PageHead
        title="内容分析 / 复盘"
        desc="用数据看见内容的真实效果，找到可复制的增长路径。"
        action={<button type="button" className="filter-date">最近 7 天　⌄　基于当前工作区</button>}
      />

      <div className="stats five">
        <Stat icon={FileText} label="总播放量" value={formatCount(totalViews)} delta="" sub="等待接入表现快照" />
        <Stat icon={Sparkles} label="互动率" value="—" delta="" color="#ef6a7b" sub="等待接入表现快照" />
        <Stat icon={Zap} label="转化率" value="—" delta="" color="#f1a535" sub="等待接入表现快照" />
        <Stat icon={Flame} label="高表现内容" value="0" delta="" color="#856eea" sub="等待接入表现快照" />
        <Stat icon={TrendingUp} label="本周增长" value="—" delta="" color="#37b986" sub="等待接入表现快照" />
      </div>

      <div className="analytics-grid">
        <Section title="播放趋势" action={<button type="button" className="select-action">播放量⌄</button>}>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4a86fa" stopOpacity={0.24} />
                    <stop offset="100%" stopColor="#4a86fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#edf0f5" />
                <XAxis dataKey="d" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="v" stroke="#3378f6" fill="url(#fill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="平台分布">
          <div className="pie-wrap">
            <ResponsiveContainer width="52%" height="100%">
              <PieChart>
                <Pie data={platform} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3}>
                  {platform.map((x) => (
                    <Cell key={x.name} fill={x.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div>
              {platform.map((x) => (
                <div className="legend" key={x.name}>
                  <i style={{ background: x.color }} />
                  {x.name}
                  <b>{state.content.length ? Math.round((x.value / state.content.length) * 100) : 0}%</b>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="AI 复盘结论" className="conclusion">
          <Badge tone="blue">本周内容整体表现优秀</Badge>
          <p>
            当前工作区已有 {state.content.length} 条内容记录；接入表现快照后，这里会展示真实播放、互动与转化趋势。
          </p>
          <h3>本周表现亮点</h3>
            {["排期记录按平台聚合", "内容状态来自服务端", "表现指标等待快照数据"].map(
            (x, i) => (
              <div className="rank" key={x}>
                <span>{i + 1}</span>
                {x}
              </div>
            )
          )}
        </Section>
      </div>

      <Section title="最近发布的内容" className="recent">
        <table>
          <thead>
            <tr>
              <th>内容信息</th>
              <th>平台</th>
              <th>发布时间</th>
              <th>播放量</th>
              <th>点赞</th>
              <th>收藏</th>
              <th>AI 表现评分</th>
            </tr>
          </thead>
          <tbody>
            {recentContent.map((x) => (
              <tr key={x.title}>
                <td>
                  <div className="table-content">
                    <div className="tiny-thumb" style={{ background: x.image }} />
                    <strong>{x.title}</strong>
                  </div>
                </td>
                <td>{x.platform}</td>
                <td>{x.scheduledAt ? formatDate(x.scheduledAt) : "未排期"}</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>
                  <span className="score">{x.score}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}
