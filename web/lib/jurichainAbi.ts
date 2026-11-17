// Dibuat otomatis oleh scripts/deploy.ts / scripts/export-abi.ts — jangan diedit manual.
export const jurichainAbi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "BelumKomit",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BobotTidakValid",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BukanAdmin",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BukanJuri",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BukanPanitia",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BukanPanitiaLomba",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BukanPeserta",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "HashKosong",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "HashTidakCocok",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "JumlahNilaiSalah",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "JuriKurang",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "KaryaTidakAda",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "akun",
        "type": "address"
      }
    ],
    "name": "KonflikPeran",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "KuorumTidakValid",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LombaTidakAda",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NilaiDiLuarRentang",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "enum JuriChain.StatusLomba",
        "name": "sekarang",
        "type": "uint8"
      }
    ],
    "name": "StatusSalah",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SudahDiset",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SudahKomit",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SudahMengumpulkan",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SudahReveal",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TenggatBelumLewat",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TenggatLewat",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TenggatTidakValid",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "idKarya",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "juri",
        "type": "address"
      }
    ],
    "name": "GagalReveal",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address[]",
        "name": "juri",
        "type": "address[]"
      }
    ],
    "name": "JuriDitetapkan",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "idKarya",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "peserta",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "hashKarya",
        "type": "bytes32"
      }
    ],
    "name": "KaryaDikumpulkan",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "panitia",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "nama",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "hashPanduan",
        "type": "bytes32"
      }
    ],
    "name": "LombaDibuat",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "idKarya",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "juri",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "hashNilai",
        "type": "bytes32"
      }
    ],
    "name": "NilaiDikomit",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "idKarya",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "juri",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8[]",
        "name": "nilai",
        "type": "uint8[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "skorTertimbang",
        "type": "uint256"
      }
    ],
    "name": "NilaiDireveal",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "akun",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "aktif",
        "type": "bool"
      }
    ],
    "name": "PanitiaDiatur",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "peserta",
        "type": "address"
      }
    ],
    "name": "PesertaDidaftarkan",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum JuriChain.StatusLomba",
        "name": "statusBaru",
        "type": "uint8"
      }
    ],
    "name": "StatusBerubah",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "admin",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "akun",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "aktif",
        "type": "bool"
      }
    ],
    "name": "aturPanitia",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "nama",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "hashPanduan",
        "type": "bytes32"
      },
      {
        "internalType": "string[]",
        "name": "kriteria",
        "type": "string[]"
      },
      {
        "internalType": "uint8[]",
        "name": "bobot",
        "type": "uint8[]"
      },
      {
        "internalType": "uint64[3]",
        "name": "tenggat",
        "type": "uint64[3]"
      },
      {
        "internalType": "uint8",
        "name": "kuorum",
        "type": "uint8"
      }
    ],
    "name": "buatLomba",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      }
    ],
    "name": "bukaPendaftaran",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "idKarya",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "hashNilai",
        "type": "bytes32"
      }
    ],
    "name": "commitNilai",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "daftarKarya",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "peserta",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "hashKarya",
        "type": "bytes32"
      },
      {
        "internalType": "uint64",
        "name": "waktuKumpul",
        "type": "uint64"
      },
      {
        "internalType": "uint256",
        "name": "totalTertimbang",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "jumlahReveal",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "daftarLomba",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "nama",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "hashPanduan",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "panitia",
        "type": "address"
      },
      {
        "internalType": "uint64",
        "name": "batasDaftar",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "batasCommit",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "batasReveal",
        "type": "uint64"
      },
      {
        "internalType": "uint8",
        "name": "kuorum",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "jumlahKarya",
        "type": "uint256"
      },
      {
        "internalType": "enum JuriChain.StatusLomba",
        "name": "status",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "peserta",
        "type": "address"
      }
    ],
    "name": "daftarkanPeserta",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      }
    ],
    "name": "getJuri",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      }
    ],
    "name": "getKriteria",
    "outputs": [
      {
        "internalType": "string[]",
        "name": "nama",
        "type": "string[]"
      },
      {
        "internalType": "uint8[]",
        "name": "bobot",
        "type": "uint8[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "idKarya",
        "type": "uint256"
      },
      {
        "internalType": "uint8[]",
        "name": "nilai",
        "type": "uint8[]"
      },
      {
        "internalType": "bytes32",
        "name": "salt",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "juri",
        "type": "address"
      }
    ],
    "name": "hitungHashNilai",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isJuri",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isPanitia",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isPeserta",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "jmlGagalReveal",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "jumlahLomba",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "karyaMilik",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "komitmen",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "hashKarya",
        "type": "bytes32"
      }
    ],
    "name": "kumpulkanKarya",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "idKarya",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "idKarya",
        "type": "uint256"
      }
    ],
    "name": "lihatSkor",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "totalTertimbang",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "jumlahReveal",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "rataRataX100",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      }
    ],
    "name": "majukanTahap",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "idKarya",
        "type": "uint256"
      },
      {
        "internalType": "uint8[]",
        "name": "nilai",
        "type": "uint8[]"
      },
      {
        "internalType": "bytes32",
        "name": "salt",
        "type": "bytes32"
      }
    ],
    "name": "revealNilai",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "sudahReveal",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "idLomba",
        "type": "uint256"
      },
      {
        "internalType": "address[]",
        "name": "juri",
        "type": "address[]"
      }
    ],
    "name": "tetapkanJuri",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
