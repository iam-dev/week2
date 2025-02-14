const { poseidonContract } = require("circomlibjs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { groth16 } = require("snarkjs");

function unstringifyBigInts(o) {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return BigInt(o);
    } else if ((typeof(o) == "string") && (/^0x[0-9a-fA-F]+$/.test(o) ))  {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o == "object") {
        if (o===null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

describe("MerkleTree", function () {
    let merkleTree;

    beforeEach(async function () {

        const PoseidonT3 = await ethers.getContractFactory(
            poseidonContract.generateABI(2),
            poseidonContract.createCode(2)
        )
        const poseidonT3 = await PoseidonT3.deploy();
        await poseidonT3.deployed();

        const MerkleTree = await ethers.getContractFactory("MerkleTree", {
            libraries: {
                PoseidonT3: poseidonT3.address
            },
          });
        merkleTree = await MerkleTree.deploy();
        await merkleTree.deployed();
    });

    it("Should return 15 leaves", async function () {
        expect(await merkleTree.hashLength()).to.equal(15);
    });

    it("Should return 8 blank leaves", async function () {
        for(let i = 0; i < 8; i++) {
            expect(await merkleTree.hashByIndex(i)).to.equal(0);
        }
    });

    it("Should return root leave", async function () {
        const root = await merkleTree.root();
        console.log("root", root);
        const total = await merkleTree.hashLength();
        console.log("total", total);
        expect(await merkleTree.hashByIndex(total-1)).to.equal(root);
    });

    it("Insert two new leaves and verify the first leaf in an inclusion proof", async function () {
        const oldRoot = await merkleTree.root();
        await merkleTree.insertLeaf(1);
        await merkleTree.insertLeaf(2);
        const newRoot = await merkleTree.root();
        expect(newRoot).to.not.equal(oldRoot);

        const node9 = (await merkleTree.hashByIndex(9)).toString();
        const node13 = (await merkleTree.hashByIndex(13)).toString();

        const Input = {
            "leaf": "1",
            "path_elements": ["2", node9, node13],
            "path_index": ["0", "0", "0"]
        }
        const { proof, publicSignals } = await groth16.fullProve(Input, "circuits/circuit_js/circuit.wasm","circuits/circuit_final.zkey");

        const editedPublicSignals = unstringifyBigInts(publicSignals);
        const editedProof = unstringifyBigInts(proof);
        const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);
    
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
    
        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const input = argv.slice(8);

        expect(await merkleTree.verify(a, b, c, input)).to.be.true;

        // [bonus] verify the second leaf with the inclusion proof
    });
    it("Insert two new leaves and verify the second leaf in an inclusion proof", async function () {
        // [bonus] verify the second leaf with the inclusion proof
        await merkleTree.insertLeaf(1);
        await merkleTree.insertLeaf(2);

        const node9 = (await merkleTree.hashByIndex(9)).toString();
        const node13 = (await merkleTree.hashByIndex(13)).toString();

        const Input = {
            "leaf": "2",
            "path_elements": ["1", node9, node13],
            "path_index": ["1", "0", "0"]
        }
        const { proof, publicSignals } = await groth16.fullProve(Input, "circuits/circuit_js/circuit.wasm","circuits/circuit_final.zkey");

        const editedPublicSignals = unstringifyBigInts(publicSignals);
        const editedProof = unstringifyBigInts(proof);
        const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);
    
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
    
        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const input = argv.slice(8);

        expect(await merkleTree.verify(a, b, c, input)).to.be.true;
    });
});
