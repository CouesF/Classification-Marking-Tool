const express = require('express');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs')

const app = express();
const PORT = process.env.PORT || 3891;
const sheet_file_name = "output.xlsx"


// 读取Excel文件
const workbook = xlsx.readFile(path.join(__dirname, "../", sheet_file_name));
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// 获取所有行数据
const data = xlsx.utils.sheet_to_json(worksheet);

const col1 = 'scene_tag_auto'; // is not null
const col2 = 'col2'; // is null
// 筛选待打标的行
//const filteredData = data.filter(row => row[col1] !== undefined && row[col2] === undefined);
const filteredData = data.filter(row => row[col1] !== "");
const totalRowsCount = filteredData.length;
console.log(`totalRowsCount:`, totalRowsCount);

// 配置中间件
app.use(express.json());


// 静态文件托管
app.use(express.static(path.join(__dirname, '../frontend/dist')));


// 获取需要打标的总数
app.get('/get-total', (req, res) => {
    res.json({ count: totalRowsCount });
});




app.get('/get-data', (req, res) => {
    const index = parseInt(req.query.index, 10);
    console.log(`Received request with index: ${index}`);
    res.setHeader('Cache-Control', 'no-store');

    if (index >= 0 && index < filteredData.length) {
        const row = filteredData[index];
        const imagePath = row['image']; // 假设image列的列名为'image'
        console.log(`Retrieved row: ${JSON.stringify(row)}`);

        if (imagePath) {
            const fullPath = path.join(__dirname, "../train/", imagePath);
            console.log(`Image path: ${fullPath}`);

            fs.readFile(fullPath, { encoding: 'base64' }, (err, base64Image) => {
                if (err) {
                    console.error(`Error reading image file: ${err}`);
                    res.status(500).json({ error: 'Error reading image file' });
                } else {
                    console.log('[200]Successfully read image file');
                    res.status(200).json({ data: { ...row, base64Image } });
                }
            });
        } else {
            console.log('No image path found in the row');
            res.status(200).json({ data: row });
        }
    } else {
        console.warn(`Index out of range: ${index}`);
        res.status(404).json({ error: 'Index out of range' });
    }
});

function saveExcelFile() {
    const filePath = path.join(__dirname, "../", sheet_file_name);
    xlsx.writeFile(workbook, filePath);
    console.log('Excel file saved successfully.');

    const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
    const timestampedFilePath = path.join(__dirname, "../", `output_${timestamp}.xlsx`);
    xlsx.writeFile(workbook, timestampedFilePath);
    console.log('Timestamped Excel file saved successfully as', timestampedFilePath);

    // 获取目录下所有带时间戳的文件
    const files = fs.readdirSync(path.join(__dirname, "../"))
        .filter(file => file.startsWith('output_') && file.endsWith('.xlsx'))
        .map(file => ({
            name: file,
            time: fs.statSync(path.join(__dirname, "../", file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // 按时间降序排序

    // 保留最近的三个文件，删除其他的
    if (files.length > 3) {
        files.slice(3).forEach(file => {
            fs.unlinkSync(path.join(__dirname, "../", file.name));
            console.log(`Deleted old timestamped file: ${file.name}`);
        });
    }
}


let pendingUpdates = [];

setInterval(() => {
    if (pendingUpdates.length > 0) {
        console.log('Batch saving updates...');
        pendingUpdates.forEach(update => {
            const { rowIndex, hallType, isHall, sceType } = update;
            const row = data[rowIndex];

            if (hallType !== undefined) row.hallType = hallType;
            if (isHall !== undefined) row.isHall = isHall;
            if (sceType !== undefined) row.sceType = sceType;

            const range = xlsx.utils.decode_range(worksheet['!ref']);
            const headerRow = worksheet['!ref'].split(':')[0].match(/\d+/)[0];

            const findColumnLetter = (header, key) => {
                for (const cell in header) {
                    if (header[cell].v === key) {
                        return cell.match(/[A-Z]+/)[0];
                    }
                }
                return null;
            };

            const hallTypeCol = findColumnLetter(worksheet, 'hallType');
            const isHallCol = findColumnLetter(worksheet, 'isHall');
            const sceTypeCol = findColumnLetter(worksheet, 'sceType');

            const updateCell = (colLetter, value) => {
                const cellAddress = `${colLetter}${rowIndex + 2}`;
                worksheet[cellAddress] = { t: 'n', v: value };
                console.log(`Updated cell ${cellAddress} to value: ${value}`);
            };

            if (hallTypeCol) updateCell(hallTypeCol, hallType);
            if (isHallCol) updateCell(isHallCol, isHall);
            if (sceTypeCol) updateCell(sceTypeCol, sceType);
        });

        saveExcelFile();
        pendingUpdates = [];
    }
}, 8000);

app.post('/set-data', (req, res) => {
    const image = req.body.image;
    const { hallType, isHall, sceType, userId } = req.body;

    const rowIndex = data.findIndex(row => row['image'] === image);

    if (rowIndex !== -1) {
        // pendingUpdates.push({ rowIndex, hallType, isHall, sceType });
        console.log(`userid:${userId},findex:${req.body.index};index:${rowIndex};Pending update for image ${image}: hallType=${hallType}, isHall=${isHall}, sceType=${sceType}`);

        // 及时更新JSON数据
        const row = filteredData[req.body.index];
        if (hallType !== undefined) row.hallType = hallType;
        if (isHall !== undefined) row.isHall = isHall;
        if (sceType !== undefined) row.sceType = sceType;
        if (userId !== undefined) userId = "default";
        // 追加更新的数据到CSV文件
        const csvRow = `${row.image},${hallType || row.hallType || 'null'},${isHall || row.isHall || 'null'},${sceType || row.sceType || 'null'},${userId}\n`;
        fs.appendFile(path.join(__dirname, "../", "updates.csv"), csvRow, err => {
            if (err) {
                console.error('Error appending to CSV file:', err);
            } 
        });
        res.json({ status: 'success' });
    } else {
        res.status(404).json({ error: 'Image not found in filtered data' });
    }
});

// 处理所有其他路由，返回前端的 index.html 文件
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});