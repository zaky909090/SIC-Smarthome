import {
  eventDuration,
  formatDateTime,
  formatDuration,
  getEventDisplay,
  RANGES,
  STATUS_META,
} from "./iot.js";

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
      "ID Kejadian",
      "ID Sesi Perangkat",
      "Perangkat",
      "Tanggal",
      "Jenis",
      "Judul",
      "Detail",
      "Sumber",
      "Kategori",
      "Status",
      "Gas (%)",
      "Durasi",
    ],
    ...events.map((event) => {
      const display = getEventDisplay(event);
      return [
        event.id,
        event.boot,
        event.device,
        formatDateTime(event.time),
        event.type,
        display.title,
        display.detail,
        display.source,
        display.category,
        display.state,
        event.gas ?? "",
        formatDuration(eventDuration(event, now)),
      ];
    }),
  ];

  download(`kejadian-gas-${stamp(now)}.csv`, rows);
}

export function exportHistory(bins, range) {
  const rows = [
    ["Awal interval", "Akhir interval", "Puncak gas (%)", "Rata-rata gas (%)", "Sampel", "Status"],
    ...bins.map((bin) => [
      formatDateTime(bin.start),
      formatDateTime(bin.end),
      bin.peak,
      bin.average,
      bin.samples,
      STATUS_META[bin.status]?.label || bin.status || "",
    ]),
  ];

  const label = RANGES[range]?.short.replace(" ", "") || range;
  download(`riwayat-gas-${label}-${stamp(Date.now())}.csv`, rows);
}
