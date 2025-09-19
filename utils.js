export function makeTable(data) {
  return data.map((row) =>
    row.map((cell) => ({ text: cell || '--', callback_data: 'noop' })),
  );
}
