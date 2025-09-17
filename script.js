// GANTIKAN DENGAN URL WEB APP ANDA DARI LANGKAH 2
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwLFW7TRJkGX8FT7z2BuHbqxGUX3lcDOkmS1yiQTyJkRWPBSwHTJOwuPz3iOreCXJb6rQ/exec";

// Fungsi untuk menukar paparan bahagian
function tunjukBahagian(idBahagian) {
    document.querySelectorAll('.bahagian').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(idBahagian).style.display = 'block';
}

// Fungsi utama untuk mengambil data dari Google Sheets
async function ambilData(namaHelaian) {
    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=${namaHelaian}`);
        const json = await response.json();
        if (json.error) {
            throw new Error(json.error);
        }
        return json.data;
    } catch (error) {
        console.error(`Gagal mengambil data dari helaian ${namaHelaian}:`, error);
        return []; // Pulangkan array kosong jika gagal
    }
}

// Fungsi untuk memaparkan data murid
async function paparSenaraiMurid() {
    // Ambil semua data serentak untuk kecekapan
    const [senaraiMurid, unitKoKu] = await Promise.all([
        ambilData('SenaraiMurid'),
        ambilData('UnitKoKu')
    ]);

    // Cipta 'lookup map' untuk akses pantas nama unit
    const unitMap = unitKoKu.reduce((map, unit) => {
        map[unit.ID_Unit] = unit.Nama_Unit;
        return map;
    }, {});

    const tbody = document.getElementById('dataMurid');
    tbody.innerHTML = ''; // Kosongkan jadual sebelum isi data baru
    
    senaraiMurid.forEach(murid => {
        const row = `
            <tr>
                <td>${murid.Nama_Murid}</td>
                <td>${murid.Kelas}</td>
                <td>${unitMap[murid.ID_Kelab] || 'N/A'}</td>
                <td>${unitMap[murid.ID_Uniform] || 'N/A'}</td>
                <td>${unitMap[murid.ID_Sukan] || 'N/A'}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Fungsi untuk memaparkan laporan aktiviti
async function paparLaporan() {
    const [laporan, unitKoKu] = await Promise.all([
        ambilData('LaporanAktiviti'),
        ambilData('UnitKoKu')
    ]);

    const unitMap = unitKoKu.reduce((map, unit) => {
        map[unit.ID_Unit] = unit.Nama_Unit;
        return map;
    }, {});

    const container = document.getElementById('dataLaporan');
    container.innerHTML = '';

    laporan.sort((a, b) => new Date(b.Tarikh) - new Date(a.Tarikh)); // Susun ikut tarikh terkini

    laporan.forEach(l => {
        const kad = `
            <div class="laporan-kad">
                <h3>${l.Tajuk_Aktiviti} - ${unitMap[l.ID_Unit] || 'Unit Tidak Diketahui'}</h3>
                <p><strong>Tarikh:</strong> ${new Date(l.Tarikh).toLocaleDateString('ms-MY')}</p>
                <p>${l.Butiran_Laporan}</p>
            </div>
        `;
        container.innerHTML += kad;
    });
}

// Fungsi untuk memaparkan pencapaian
async function paparPencapaian() {
    const [pencapaian, senaraiMurid] = await Promise.all([
        ambilData('Pencapaian'),
        ambilData('SenaraiMurid')
    ]);

    const muridMap = senaraiMurid.reduce((map, murid) => {
        map[murid.ID_Murid] = murid.Nama_Murid;
        return map;
    }, {});
    
    const tbody = document.getElementById('dataPencapaian');
    tbody.innerHTML = '';

    pencapaian.forEach(p => {
        const row = `
            <tr>
                <td>${muridMap[p.ID_Murid] || 'N/A'}</td>
                <td>${p.Nama_Pertandingan}</td>
                <td>${p.Peringkat}</td>
                <td>${p.Pencapaian}</td>
                <td>${new Date(p.Tarikh).toLocaleDateString('ms-MY')}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Fungsi carian untuk jadual
function cariData(inputId, tableId) {
    const input = document.getElementById(inputId);
    const filter = input.value.toUpperCase();
    const table = document.getElementById(tableId);
    const tr = table.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) { // Mula dari 1 untuk langkau header
        let rowVisible = false;
        let td = tr[i].getElementsByTagName("td");
        for (let j = 0; j < td.length; j++) {
            if (td[j]) {
                if (td[j].innerHTML.toUpperCase().indexOf(filter) > -1) {
                    rowVisible = true;
                    break;
                }
            }
        }
        tr[i].style.display = rowVisible ? "" : "none";
    }
}

// Jalankan fungsi-fungsi ini apabila laman web dimuatkan
document.addEventListener('DOMContentLoaded', () => {
    paparSenaraiMurid();
    paparLaporan();
    paparPencapaian();
});

// Fungsi BARU untuk mengisi pilihan unit dalam borang
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

// Fungsi BARU untuk menghantar data laporan
async function hantarLaporan(event) {
    event.preventDefault(); // Halang borang dari refresh laman

    const statusDiv = document.getElementById('statusHantar');
    statusDiv.textContent = 'Menghantar...';

    // Kumpul data dari borang
    const data = {
        sheet: 'LaporanAktiviti', // Beritahu Apps Script ke mana nak simpan
        id_unit: document.getElementById('pilihanUnit').value,
        tarikh: document.getElementById('tarikhLaporan').value,
        tajuk: document.getElementById('tajukLaporan').value,
        butiran: document.getElementById('butiranLaporan').value
    };

    try {
        // Hantar data menggunakan method POST
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.status === 'success') {
            statusDiv.textContent = '✓ Laporan berjaya dihantar!';
            statusDiv.style.color = 'green';
            document.getElementById('borangLaporan').reset(); // Kosongkan borang
            paparLaporan(); // Muat semula senarai laporan
        } else {
            throw new Error(result.message);
        }

    } catch (error) {
        statusDiv.textContent = `✗ Gagal menghantar: ${error.message}`;
        statusDiv.style.color = 'red';
    }

    // Hilangkan mesej status selepas 5 saat
    setTimeout(() => {
        statusDiv.textContent = '';
    }, 5000);
}
