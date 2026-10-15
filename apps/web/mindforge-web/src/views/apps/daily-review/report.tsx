import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Sparkles } from 'lucide-react';
import { createConversation, sendMessage } from '@/api/ai/ai';
import { getDailyReviewReport, type DailyReviewReport } from '@/api/daily-review/daily-review';
import MarkdownEditor from '@/components/markdown/markdown-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ReviewReport({
  reportType,
  date,
}: {
  reportType: 'weekly' | 'monthly' | 'yearly';
  date: string;
}) {
  const [report, setReport] = useState<DailyReviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const loadSequence = useRef(0);
  const summarySequence = useRef(0);
  const load = useCallback(async () => {
    const currentRequest = ++loadSequence.current;
    ++summarySequence.current;
    setLoading(true);
    setReport(null);
    setSummary('');
    setSummarizing(false);
    try {
      const result = await getDailyReviewReport(reportType, date);
      if (currentRequest !== loadSequence.current) return;
      setReport(result.data);
      setError('');
    } catch {
      if (currentRequest === loadSequence.current) setError('报告加载失败，请重试。');
    } finally {
      if (currentRequest === loadSequence.current) setLoading(false);
    }
  }, [reportType, date]);
  useEffect(() => {
    const requestCounters = { load: loadSequence, summary: summarySequence };
    void load();
    return () => {
      ++requestCounters.load.current;
      ++requestCounters.summary.current;
    };
  }, [load]);
  const markdown = report
    ? `# 复盘报告 ${report.startDate} 至 ${report.endDate}\n\n共 ${report.entries.length} 天记录\n\n${summary ? `## AI 总结\n\n${summary}\n\n` : ''}${report.entries.map((item) => `## ${item.date}\n\n${item.content}`).join('\n\n')}`
    : '';
  const exportReport = () => {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `复盘报告-${report.startDate}-${report.endDate}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const generate = async () => {
    if (!report?.entries.length || summarizing) return;
    const currentSummary = ++summarySequence.current;
    setSummarizing(true);
    setError('');
    try {
      const history = report.entries.map((item) => `${item.date}\n${item.content}`).join('\n\n');
      const conversation = await createConversation(
        `复盘总结 ${report.startDate} 至 ${report.endDate}`,
      );
      const result = await sendMessage(
        conversation.data.id,
        `请根据以下真实复盘内容总结完成事项、收获、问题和下一步行动，不要虚构记录中没有的信息。${history.length > 8500 ? '由于记录较长，输入仅包含前 8500 字符。' : ''}\n\n${history.slice(0, 8500)}`,
      );
      if (currentSummary === summarySequence.current)
        setSummary(result.data.assistantMessage.content);
    } catch {
      if (currentSummary === summarySequence.current)
        setError('AI 总结失败，请在账户设置中确认接口配置与连接状态。');
    } finally {
      if (currentSummary === summarySequence.current) setSummarizing(false);
    }
  };
  if (loading)
    return <p className="py-12 text-center text-sm text-muted-foreground">正在加载本周期复盘…</p>;
  return (
    <div className="space-y-5">
      {report && (
        <p className="text-sm text-muted-foreground">
          报告区间：{report.startDate} 至 {report.endDate}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{report?.entries.length ?? 0} 天已记录</Badge>
        <Button
          disabled={!report || summarizing}
          size="sm"
          variant="outline"
          onClick={exportReport}
        >
          <Download />
          导出 Markdown
        </Button>
        <Button
          disabled={!report?.entries.length || summarizing}
          size="sm"
          variant="outline"
          onClick={() => void generate()}
        >
          <Sparkles />
          {summarizing ? '生成中…' : 'AI 总结'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {summary && (
        <section className="space-y-3 rounded-xl border bg-primary/5 p-4">
          <h3 className="font-medium">AI 总结</h3>
          <p className="whitespace-pre-wrap text-sm leading-7">{summary}</p>
        </section>
      )}
      {report?.entries.length ? (
        report.entries.map((item) => (
          <section className="space-y-3" key={item.date}>
            <h3 className="font-medium">{item.date}</h3>
            <MarkdownEditor value={item.content} disabled minHeight={160} />
          </section>
        ))
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">
          本周期没有复盘记录，先记录一天再生成报告。
        </p>
      )}
    </div>
  );
}
