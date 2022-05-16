include "./Poseidon/poseidonHashT3.circom";

template PoseidonHashSwitcher() {
    signal input left;
    signal input right;

    signal output hash;

    component hasher = PoseidonHashT3();
    left ==> hasher.inputs[0];
    right ==> hasher.inputs[1];

    hash <== hasher.out;
}