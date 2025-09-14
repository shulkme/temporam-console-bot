export function makeTable(data) {
  // data: 二维数组，例如
  // [
  //   ["ID", "Name", "Score"],
  //   ["1", "Alice", "95"],
  //   ["2", "Bob", "88"],
  //   ["3", "Carol", "76"]
  // ]

  // 计算每一列的最大宽度
  const colWidths = data[0].map((_, colIndex) =>
    Math.max(...data.map((row) => String(row[colIndex]).length)),
  );

  // 拼接每一行
  const lines = data.map((row) =>
    row.map((cell, i) => String(cell).padEnd(colWidths[i], ' ')).join('   '),
  );

  // 用代码块保证等宽字体
  return '<pre>' + lines.join('\n') + '</pre>';
}
