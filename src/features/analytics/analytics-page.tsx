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
import { content, chart, platform } from "../../data/mock-analytics";
import { Badge, Stat, PageHead, Section } from "../../components/shared/legacy";

export default function Analytics() {
  return (
    <>
      <PageHead
        title="内容分析 / 复盘"
        desc="用数据看见内容的真实效果，找到可复制的增长路径。"
        action={<button type="button" className="filter-date">最近 7 天　⌄　 4月9日 - 4月16日</button>}
      />

      <div className="stats five">
        <Stat icon={FileText} label="总播放量" value="128.6万" delta="42%" sub="较上周 90.5万" />
        <Stat icon={Sparkles} label="互动率" value="6.8%" delta="1.9%" color="#ef6a7b" sub="较上周 4.9%" />
        <Stat icon={Zap} label="转化率" value="2.3%" delta="0.8%" color="#f1a535" sub="较上周 1.5%" />
        <Stat icon={Flame} label="高表现内容" value="12" delta="71%" color="#856eea" sub="播放 > 10万的内容" />
        <Stat icon={TrendingUp} label="本周增长" value="+38%" delta="" color="#37b986" sub="较上周播放增长" />
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
                  <b>{x.value}.3%</b>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="AI 复盘结论" className="conclusion">
          <Badge tone="blue">本周内容整体表现优秀</Badge>
          <p>
            播放量较上周提升 38%，互动率提升 1.9 个百分点。知识型内容增长明显，3 条内容播放超过 20 万。
          </p>
          <h3>本周表现亮点</h3>
          {["AI 工具类内容播放量占比 42%", "方法论 + 案例，综合表现更好", "晚间 18-22 点发布效果最佳"].map(
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
            {content.map((x, i) => (
              <tr key={x.title}>
                <td>
                  <div className="table-content">
                    <div className="tiny-thumb" style={{ background: x.image }} />
                    <strong>{x.title}</strong>
                  </div>
                </td>
                <td>{x.source}</td>
                <td>4月16日 10:24</td>
                <td>{["32.0万", "18.6万", "12.4万", "9.8万"][i]}</td>
                <td>2.1万</td>
                <td>326</td>
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
