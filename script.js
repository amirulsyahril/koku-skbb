// GANTIKAN DENGAN URL WEB APP ANDA YANG SEBENAR
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwLFW7TRJkGX8FT7z2BuHbqxGUX3lcDOkmS1yiQTyJkRWPBSwHTJOwuPz3iOreCXJb6rQ/exec";

// --- PENGURUSAN PAPARAN ---
function tunjukBahagian(idBahagian) {
    document.querySelectorAll('.bahagian').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(idBahagian).style.display = 'block';
}

// --- FUNGSI MENDAPATKAN DATA (GET) ---
async function ambilData(namaHelaian) {
    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=${namaHelaian}`);
        const json = await response.json();
        if (json.error) throw new Error(json.error);
        return json.data;
    } catch (error) {
        console.error(`Gagal mengambil data dari helaian ${namaHelaian}:`, error);
        return [];
    }
}

// --- FUNGSI MEMAPARKAN DATA ---
async function paparSenaraiMurid() {
    const tbody = document.getElementById('dataMurid');
    tbody.innerHTML = '<tr><td colspan="5">Memuatkan data murid...</td></tr>';
    const [senaraiMurid, unitKoKu] = await Promise.all([ambilData('SenaraiMurid'), ambilData('UnitKoKu')]);
    const unitMap = unitKoKu.reduce((map, unit) => ({ ...map, [unit.ID_Unit]: unit.Nama_Unit }), {});
    let content = '';
    senaraiMurid.forEach(murid => {
        content += `<tr>
            <td>${murid.Nama_Murid}</td>
            <td>${murid.Kelas}</td>
            <td>${unitMap[murid.ID_Kelab] || 'N/A'}</td>
            <td>${unitMap[murid.ID_Uniform] || 'N/A'}</td>
            <td>${unitMap[murid.ID_Sukan] || 'N/A'}</td>
        </tr>`;
    });
    tbody.innerHTML = content || '<tr><td colspan="5">Tiada data murid.</td></tr>';
}

async function paparLaporan() {
    const container = document.getElementById('dataLaporan');
    container.innerHTML = '<p>Memuatkan laporan...</p>';
    const [laporan, unitKoKu] = await Promise.all([ambilData('LaporanAktiviti'), ambilData('UnitKoKu')]);
    const unitMap = unitKoKu.reduce((map, unit) => ({ ...map, [unit.ID_Unit]: unit.Nama_Unit }), {});
    if (laporan.length === 0) {
        container.innerHTML = '<p>Tiada laporan aktiviti buat masa ini.</p>';
        return;
    }
    laporan.sort((a, b) => new Date(b.Tarikh) - new Date(a.Tarikh));
    let content = '';
    laporan.forEach(l => {
        content += `<div class="laporan-kad">
            <h3>${l.Tajuk_Aktiviti} - ${unitMap[l.ID_Unit] || 'Unit Tidak Diketahui'}</h3>
            <p><strong>Tarikh:</strong> ${new Date(l.Tarikh).toLocaleDateString('ms-MY')}</p>
            <p>${l.Butiran_Laporan}</p>
        </div>`;
    });
    container.innerHTML = content;
}

async function paparPencapaian() {
    const tbody = document.getElementById('dataPencapaian');
    tbody.innerHTML = '<tr><td colspan="5">Memuatkan data pencapaian...</td></tr>';
    const [pencapaian, senaraiMurid] = await Promise.all([ambilData('Pencapaian'), ambilData('SenaraiMurid')]);
    const muridMap = senaraiMurid.reduce((map, murid) => ({ ...map, [murid.ID_Murid]: murid.Nama_Murid }), {});
    let content = '';
    pencapaian.forEach(p => {
        content += `<tr>
            <td>${muridMap[p.ID_Murid] || 'N/A'}</td>
            <td>${p.Nama_Pertandingan}</td>
            <td>${p.Peringkat}</td>
            <td>${p.Pencapaian}</td>
            <td>${new Date(p.Tarikh).toLocaleDateString('ms-MY')}</td>
        </tr>`;
    });
    tbody.innerHTML = content || '<tr><td colspan="5">Tiada data pencapaian.</td></tr>';
}

// --- FUNGSI PENGHANTARAN DATA (POST) ---
async function isiPilihanUnit() {
    const unitKoKu = await ambilData('UnitKoKu');
    const select = document.getElementById('pilihanUnit');
    unitKoKu.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit.ID_Unit;
        option.textContent = `${unit.Nama_Unit} (${unit.Kategori})`;
        select.appendChild(option);
    });
}

async function hantarLaporan(event) {
    event.preventDefault();
    const statusDiv = document.getElementById('statusHantar');
    statusDiv.textContent = 'Menghantar...';
    statusDiv.style.color = '#333';
    const data = { sheet: 'LaporanAktiviti', id_unit: document.getElementById('pilihanUnit').value, tarikh: document.getElementById('tarikhLaporan').value, tajuk: document.getElementById('tajukLaporan').value, butiran: document.getElementById('butiranLaporan').value };
    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(data) });
        const result = await response.json();
        if (result.status === 'success') {
            statusDiv.textContent = '✓ Laporan berjaya dihantar!';
            statusDiv.style.color = 'green';
            document.getElementById('borangLaporan').reset();
            paparLaporan();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        statusDiv.textContent = `✗ Gagal menghantar: ${error.message}`;
        statusDiv.style.color = 'red';
    }
    setTimeout(() => { statusDiv.textContent = ''; }, 5000);
}

async function prosesDanHantarCsv() {
    const statusDiv = document.getElementById('statusCsv');
    const failInput = document.getElementById('failCsv');
    const fail = failInput.files[0];
    if (!fail) {
        statusDiv.textContent = 'Sila pilih satu fail CSV dahulu.';
        statusDiv.style.color = 'red';
        return;
    }
    statusDiv.textContent = 'Membaca fail...';
    statusDiv.style.color = '#333';
    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const teksCsv = event.target.result;
            const baris = teksCsv.split('\n').filter(baris => baris.trim() !== '');
            const pengepala = baris.shift().split(',').map(h => h.trim());
            const dataMurid = baris.map(barisData => {
                const nilai = barisData.split(',').map(n => n.trim());
                return pengepala.reduce((obj, kunci, i) => ({ ...obj, [kunci]: nilai[i] }), {});
            });
            statusDiv.textContent = `Menghantar ${dataMurid.length} rekod murid...`;
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'muatNaikCsvMurid', payload: dataMurid }) });
            const result = await response.json();
            if (result.status === 'success') {
                statusDiv.textContent = `✓ ${result.message}`;
                statusDiv.style.color = 'green';
                failInput.value = '';
                paparSenaraiMurid();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            statusDiv.textContent = `✗ Ralat: ${error.message}`;
            statusDiv.style.color = 'red';
        }
    };
    reader.readAsText(fail);
}

// --- FUNGSI UTILITI ---
function cariData(inputId, tableId) {
    const filter = document.getElementById(inputId).value.toUpperCase();
    const tbody = document.getElementById(tableId).getElementsByTagName("tbody")[0];
    const tr = tbody.getElementsByTagName("tr");
    for (let i = 0; i < tr.length; i++) {
        let td = tr[i].getElementsByTagName("td")[0];
        if (td) {
            tr[i].style.display = (td.textContent || td.innerText).toUpperCase().indexOf(filter) > -1 ? "" : "none";
        }
    }
}

// --- EVENT LISTENER UTAMA ---
document.addEventListener('DOMContentLoaded', () => {
    paparSenaraiMurid();
    paparLaporan();
    paparPencapaian();
    isiPilihanUnit();
    document.getElementById('borangLaporan').addEventListener('submit', hantarLaporan);
    document.getElementById('butangMuatNaikCsv').addEventListener('click', prosesDanHantarCsv);
});
