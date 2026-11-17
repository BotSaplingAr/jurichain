// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title JuriChain - Penjurian lomba transparan dengan skema commit-reveal
/// @notice Satu kontrak untuk banyak lomba (dipisahkan idLomba). Tokenless, non-upgradeable.
/// @dev Draf prototipe sesuai Bagian 5 laporan UTS Kelompok 3 (CTJ483).
contract JuriChain {
    // ------------------------------------------------------------------
    // Tipe data
    // ------------------------------------------------------------------
    enum StatusLomba {
        DIBUAT,
        PENDAFTARAN,
        PENILAIAN_COMMIT,
        PENILAIAN_REVEAL,
        DIUMUMKAN,
        SENGKETA
    }

    struct Lomba {
        uint256 id;
        string nama;
        bytes32 hashPanduan;
        address panitia;
        uint64 batasDaftar;
        uint64 batasCommit;
        uint64 batasReveal;
        uint8 kuorum;
        uint256 jumlahKarya;
        StatusLomba status;
    }

    struct Karya {
        uint256 id;
        address peserta;
        bytes32 hashKarya;
        uint64 waktuKumpul;
        uint256 totalTertimbang; // jumlah dari sum(nilai[i] * bobot[i]); skala 0..10000 per juri
        uint8 jumlahReveal;
    }

    // ------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------
    address public immutable admin;
    uint256 public jumlahLomba;

    mapping(uint256 => Lomba) public daftarLomba;
    mapping(uint256 => string[]) private namaKriteria;
    mapping(uint256 => uint8[]) private bobotKriteria;

    mapping(address => bool) public isPanitia; // peran global
    mapping(uint256 => mapping(address => bool)) public isJuri; // per lomba
    mapping(uint256 => mapping(address => bool)) public isPeserta; // per lomba
    mapping(uint256 => address[]) private daftarJuri;

    // idLomba => idKarya (mulai 1) => Karya
    mapping(uint256 => mapping(uint256 => Karya)) public daftarKarya;
    // idLomba => peserta => idKarya (0 = belum mengumpulkan)
    mapping(uint256 => mapping(address => uint256)) public karyaMilik;

    // idLomba => idKarya => juri => hash commit / penanda reveal
    mapping(uint256 => mapping(uint256 => mapping(address => bytes32))) public komitmen;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public sudahReveal;

    // reputasi sederhana juri
    mapping(address => uint256) public jmlGagalReveal;

    // ------------------------------------------------------------------
    // Event (dibaca frontend & block explorer)
    // ------------------------------------------------------------------
    event PanitiaDiatur(address indexed akun, bool aktif);
    event LombaDibuat(uint256 indexed idLomba, address indexed panitia, string nama, bytes32 hashPanduan);
    event JuriDitetapkan(uint256 indexed idLomba, address[] juri);
    event PesertaDidaftarkan(uint256 indexed idLomba, address indexed peserta);
    event StatusBerubah(uint256 indexed idLomba, StatusLomba statusBaru);
    event KaryaDikumpulkan(uint256 indexed idLomba, uint256 indexed idKarya, address indexed peserta, bytes32 hashKarya);
    event NilaiDikomit(uint256 indexed idLomba, uint256 indexed idKarya, address indexed juri, bytes32 hashNilai);
    event NilaiDireveal(uint256 indexed idLomba, uint256 indexed idKarya, address indexed juri, uint8[] nilai, uint256 skorTertimbang);
    event GagalReveal(uint256 indexed idLomba, uint256 indexed idKarya, address indexed juri);

    // ------------------------------------------------------------------
    // Error
    // ------------------------------------------------------------------
    error BukanAdmin();
    error BukanPanitia();
    error BukanPanitiaLomba();
    error BukanJuri();
    error BukanPeserta();
    error LombaTidakAda();
    error StatusSalah(StatusLomba sekarang);
    error TenggatTidakValid();
    error BobotTidakValid();
    error KuorumTidakValid();
    error JuriKurang();
    error KonflikPeran(address akun);
    error SudahDiset();
    error TenggatLewat();
    error TenggatBelumLewat();
    error KaryaTidakAda();
    error SudahMengumpulkan();
    error SudahKomit();
    error BelumKomit();
    error SudahReveal();
    error HashTidakCocok();
    error NilaiDiLuarRentang();
    error JumlahNilaiSalah();
    error HashKosong();

    // ------------------------------------------------------------------
    // Modifier
    // ------------------------------------------------------------------
    modifier hanyaAdmin() {
        if (msg.sender != admin) revert BukanAdmin();
        _;
    }

    modifier lombaAda(uint256 idLomba) {
        if (idLomba == 0 || idLomba > jumlahLomba) revert LombaTidakAda();
        _;
    }

    modifier hanyaPanitiaLomba(uint256 idLomba) {
        if (daftarLomba[idLomba].panitia != msg.sender) revert BukanPanitiaLomba();
        _;
    }

    modifier padaStatus(uint256 idLomba, StatusLomba s) {
        if (daftarLomba[idLomba].status != s) revert StatusSalah(daftarLomba[idLomba].status);
        _;
    }

    constructor() {
        admin = msg.sender;
        isPanitia[msg.sender] = true; // memudahkan demo
        emit PanitiaDiatur(msg.sender, true);
    }

    // ------------------------------------------------------------------
    // Tata kelola: admin hanya memberi / mencabut peran PANITIA
    // ------------------------------------------------------------------
    function aturPanitia(address akun, bool aktif) external hanyaAdmin {
        isPanitia[akun] = aktif;
        emit PanitiaDiatur(akun, aktif);
    }

    // ------------------------------------------------------------------
    // Tahap DIBUAT (hanya panitia lomba)
    // ------------------------------------------------------------------
    function buatLomba(
        string calldata nama,
        bytes32 hashPanduan,
        string[] calldata kriteria,
        uint8[] calldata bobot,
        uint64[3] calldata tenggat, // [batasDaftar, batasCommit, batasReveal] (unix timestamp)
        uint8 kuorum
    ) external returns (uint256 idLomba) {
        if (!isPanitia[msg.sender]) revert BukanPanitia();
        if (hashPanduan == bytes32(0)) revert HashKosong();
        if (!(block.timestamp < tenggat[0] && tenggat[0] < tenggat[1] && tenggat[1] < tenggat[2])) {
            revert TenggatTidakValid();
        }
        if (kriteria.length == 0 || kriteria.length != bobot.length) revert BobotTidakValid();
        if (_totalBobot(bobot) != 100) revert BobotTidakValid();
        if (kuorum == 0) revert KuorumTidakValid();

        idLomba = ++jumlahLomba;
        Lomba storage l = daftarLomba[idLomba];
        l.id = idLomba;
        l.nama = nama;
        l.hashPanduan = hashPanduan;
        l.panitia = msg.sender;
        l.batasDaftar = tenggat[0];
        l.batasCommit = tenggat[1];
        l.batasReveal = tenggat[2];
        l.kuorum = kuorum;
        l.status = StatusLomba.DIBUAT;

        for (uint256 i = 0; i < kriteria.length; i++) {
            namaKriteria[idLomba].push(kriteria[i]);
            bobotKriteria[idLomba].push(bobot[i]);
        }

        emit LombaDibuat(idLomba, msg.sender, nama, hashPanduan);
        emit StatusBerubah(idLomba, StatusLomba.DIBUAT);
    }

    function tetapkanJuri(uint256 idLomba, address[] calldata juri)
        external
        lombaAda(idLomba)
        hanyaPanitiaLomba(idLomba)
        padaStatus(idLomba, StatusLomba.DIBUAT)
    {
        if (daftarJuri[idLomba].length != 0) revert SudahDiset();
        if (juri.length < 3) revert JuriKurang();
        if (juri.length < daftarLomba[idLomba].kuorum) revert KuorumTidakValid();

        for (uint256 i = 0; i < juri.length; i++) {
            address j = juri[i];
            if (j == address(0) || j == msg.sender || isPeserta[idLomba][j] || isJuri[idLomba][j]) {
                revert KonflikPeran(j);
            }
            isJuri[idLomba][j] = true;
            daftarJuri[idLomba].push(j);
        }
        emit JuriDitetapkan(idLomba, juri);
    }

    function daftarkanPeserta(uint256 idLomba, address peserta)
        external
        lombaAda(idLomba)
        hanyaPanitiaLomba(idLomba)
    {
        StatusLomba s = daftarLomba[idLomba].status;
        if (s != StatusLomba.DIBUAT && s != StatusLomba.PENDAFTARAN) revert StatusSalah(s);
        if (s == StatusLomba.PENDAFTARAN && block.timestamp > daftarLomba[idLomba].batasDaftar) revert TenggatLewat();
        if (peserta == address(0) || peserta == msg.sender || isJuri[idLomba][peserta]) revert KonflikPeran(peserta);

        isPeserta[idLomba][peserta] = true;
        emit PesertaDidaftarkan(idLomba, peserta);
    }

    /// @notice DIBUAT -> PENDAFTARAN. Setelah ini kriteria, bobot, juri, dan tenggat terkunci.
    function bukaPendaftaran(uint256 idLomba)
        external
        lombaAda(idLomba)
        hanyaPanitiaLomba(idLomba)
        padaStatus(idLomba, StatusLomba.DIBUAT)
    {
        if (daftarJuri[idLomba].length < 3) revert JuriKurang();
        if (block.timestamp >= daftarLomba[idLomba].batasDaftar) revert TenggatLewat();
        _ubahStatus(idLomba, StatusLomba.PENDAFTARAN);
    }

    // ------------------------------------------------------------------
    // Tahap PENDAFTARAN (peserta)
    // ------------------------------------------------------------------
    /// @param hashKarya salted hash berkas karya yang dihitung di browser
    function kumpulkanKarya(uint256 idLomba, bytes32 hashKarya)
        external
        lombaAda(idLomba)
        padaStatus(idLomba, StatusLomba.PENDAFTARAN)
        returns (uint256 idKarya)
    {
        if (!isPeserta[idLomba][msg.sender]) revert BukanPeserta();
        if (block.timestamp > daftarLomba[idLomba].batasDaftar) revert TenggatLewat();
        if (karyaMilik[idLomba][msg.sender] != 0) revert SudahMengumpulkan();
        if (hashKarya == bytes32(0)) revert HashKosong();

        idKarya = ++daftarLomba[idLomba].jumlahKarya;
        daftarKarya[idLomba][idKarya] = Karya({
            id: idKarya,
            peserta: msg.sender,
            hashKarya: hashKarya,
            waktuKumpul: uint64(block.timestamp),
            totalTertimbang: 0,
            jumlahReveal: 0
        });
        karyaMilik[idLomba][msg.sender] = idKarya;

        emit KaryaDikumpulkan(idLomba, idKarya, msg.sender, hashKarya);
    }

    // ------------------------------------------------------------------
    // Tahap PENILAIAN_COMMIT (juri)
    // ------------------------------------------------------------------
    /// @param hashNilai keccak256(abi.encode(idLomba, idKarya, nilai[], salt, alamatJuri))
    function commitNilai(uint256 idLomba, uint256 idKarya, bytes32 hashNilai)
        external
        lombaAda(idLomba)
        padaStatus(idLomba, StatusLomba.PENILAIAN_COMMIT)
    {
        if (!isJuri[idLomba][msg.sender]) revert BukanJuri();
        if (block.timestamp > daftarLomba[idLomba].batasCommit) revert TenggatLewat();
        if (idKarya == 0 || idKarya > daftarLomba[idLomba].jumlahKarya) revert KaryaTidakAda();
        if (komitmen[idLomba][idKarya][msg.sender] != bytes32(0)) revert SudahKomit();
        if (hashNilai == bytes32(0)) revert HashKosong();

        komitmen[idLomba][idKarya][msg.sender] = hashNilai;
        emit NilaiDikomit(idLomba, idKarya, msg.sender, hashNilai);
    }

    // ------------------------------------------------------------------
    // Tahap PENILAIAN_REVEAL (juri) - atomik
    // ------------------------------------------------------------------
    function revealNilai(uint256 idLomba, uint256 idKarya, uint8[] calldata nilai, bytes32 salt)
        external
        lombaAda(idLomba)
        padaStatus(idLomba, StatusLomba.PENILAIAN_REVEAL)
    {
        if (!isJuri[idLomba][msg.sender]) revert BukanJuri();
        if (block.timestamp > daftarLomba[idLomba].batasReveal) revert TenggatLewat();
        bytes32 c = komitmen[idLomba][idKarya][msg.sender];
        if (c == bytes32(0)) revert BelumKomit();
        if (sudahReveal[idLomba][idKarya][msg.sender]) revert SudahReveal();

        uint8[] storage bobot = bobotKriteria[idLomba];
        if (nilai.length != bobot.length) revert JumlahNilaiSalah();

        // 1) verifikasi hash
        if (hitungHashNilai(idLomba, idKarya, nilai, salt, msg.sender) != c) revert HashTidakCocok();

        // 2) cek rentang 0-100 sekaligus hitung skor tertimbang
        uint256 skor;
        for (uint256 i = 0; i < nilai.length; i++) {
            if (nilai[i] > 100) revert NilaiDiLuarRentang();
            skor += uint256(nilai[i]) * bobot[i];
        }

        // 3) ubah state - semua dalam satu transaksi
        sudahReveal[idLomba][idKarya][msg.sender] = true;
        Karya storage k = daftarKarya[idLomba][idKarya];
        k.totalTertimbang += skor;
        k.jumlahReveal += 1;

        emit NilaiDireveal(idLomba, idKarya, msg.sender, nilai, skor);
    }

    // ------------------------------------------------------------------
    // Perpindahan tahap berbasis tenggat - boleh dipanggil siapa saja
    // ------------------------------------------------------------------
    function majukanTahap(uint256 idLomba) external lombaAda(idLomba) {
        Lomba storage l = daftarLomba[idLomba];

        if (l.status == StatusLomba.PENDAFTARAN) {
            if (block.timestamp <= l.batasDaftar) revert TenggatBelumLewat();
            _ubahStatus(idLomba, StatusLomba.PENILAIAN_COMMIT);
        } else if (l.status == StatusLomba.PENILAIAN_COMMIT) {
            if (block.timestamp <= l.batasCommit) revert TenggatBelumLewat();
            _ubahStatus(idLomba, StatusLomba.PENILAIAN_REVEAL);
        } else if (l.status == StatusLomba.PENILAIAN_REVEAL) {
            if (block.timestamp <= l.batasReveal) revert TenggatBelumLewat();
            _tetapkanHasil(idLomba);
        } else {
            revert StatusSalah(l.status);
        }
    }

    function _tetapkanHasil(uint256 idLomba) internal {
        Lomba storage l = daftarLomba[idLomba];
        address[] storage juri = daftarJuri[idLomba];
        bool kuorumTerpenuhi = l.jumlahKarya > 0;

        // Loop aman untuk skala demo (mis. 30 karya x 3 juri).
        for (uint256 k = 1; k <= l.jumlahKarya; k++) {
            if (daftarKarya[idLomba][k].jumlahReveal < l.kuorum) kuorumTerpenuhi = false;
            for (uint256 j = 0; j < juri.length; j++) {
                address a = juri[j];
                if (komitmen[idLomba][k][a] != bytes32(0) && !sudahReveal[idLomba][k][a]) {
                    jmlGagalReveal[a] += 1;
                    emit GagalReveal(idLomba, k, a);
                }
            }
        }
        _ubahStatus(idLomba, kuorumTerpenuhi ? StatusLomba.DIUMUMKAN : StatusLomba.SENGKETA);
    }

    function _totalBobot(uint8[] calldata bobot) internal pure returns (uint256 total) {
        for (uint256 i = 0; i < bobot.length; i++) {
            total += bobot[i];
        }
    }

    function _ubahStatus(uint256 idLomba, StatusLomba s) internal {
        daftarLomba[idLomba].status = s;
        emit StatusBerubah(idLomba, s);
    }

    // ------------------------------------------------------------------
    // View / helper
    // ------------------------------------------------------------------
    /// @notice Rumus hash commit. Frontend wajib memakai encoding yang sama (abi.encode).
    function hitungHashNilai(uint256 idLomba, uint256 idKarya, uint8[] calldata nilai, bytes32 salt, address juri)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(idLomba, idKarya, nilai, salt, juri));
    }

    /// @return totalTertimbang akumulasi skor semua juri
    /// @return jumlahReveal jumlah juri yang nilainya terbuka
    /// @return rataRataX100 rata-rata skor akhir 0..10000 (bagi 100 untuk skala 0..100, dua desimal)
    function lihatSkor(uint256 idLomba, uint256 idKarya)
        external
        view
        returns (uint256 totalTertimbang, uint8 jumlahReveal, uint256 rataRataX100)
    {
        Karya storage k = daftarKarya[idLomba][idKarya];
        totalTertimbang = k.totalTertimbang;
        jumlahReveal = k.jumlahReveal;
        rataRataX100 = jumlahReveal == 0 ? 0 : totalTertimbang / jumlahReveal;
    }

    function getKriteria(uint256 idLomba) external view returns (string[] memory nama, uint8[] memory bobot) {
        return (namaKriteria[idLomba], bobotKriteria[idLomba]);
    }

    function getJuri(uint256 idLomba) external view returns (address[] memory) {
        return daftarJuri[idLomba];
    }
}
