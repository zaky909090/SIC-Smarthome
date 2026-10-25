import { formatDateTime, formatDuration, eventDuration } from "./iot.js";

function escapeCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function download(filename, rows) {
  const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
  const blob = new Blob([`\ufeff${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function stamp(now) {
  const date = new Date(now || Date.now());
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function exportEvents(events, now) {
  const rows = [
    [
      "Event ID",
      "Boot",
      "Device",
      "Date",
      "Type",
      "Title",
      "Detail",
      "Source",
      "Category",
      "State",
      "Gas (%)",
      "Duration",
    ],
    ...events.map((event) => [
      event.id,
      event.boot,
      event.device,
      formatDateTime(event.time),
      event.type,
      event.title,
      event.detail,
      event.source,
      event.category,
      event.state,
      event.gas ?? "",
      formatDuration(eventDuration(event, now)),
    ]),
  ];

  download(`gas-events-${stamp(now)}.csv`, rows);
}

export function exportHistory(bins, range) {
  const rows = [
    ["Interval start", "Interval end", "Peak gas (%)", "Average gas (%)", "Samples", "Status"],
    ...bins.map((bin) => [
      formatDateTime(bin.start),
      formatDateTime(bin.end),
      bin.peak,
      bin.average,
      bin.samples,
      bin.status || "",
    ]),
  ];

  download(`gas-history-${range}-${stamp(Date.now())}.csv`, rows);
}
