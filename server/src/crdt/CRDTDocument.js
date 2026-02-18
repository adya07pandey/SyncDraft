export default class CRDTDocument{
    constructor(){
        this.nodes=new Map();
        this.head = null;
    }

    insert({id,char,left}){

        if(this.nodes.has(id)) return;
        console.log(char);
        const node = {id, char, deleted:false,left, right:null};
        this.nodes.set(id,node);

        if(!left){
            if(this.head){
                node.right=this.head;
                this.nodes.get(this.head).left=id;
            }
            this.head=id;
            return;
        }

        const leftNode = this.nodes.get(left);
        if(!leftNode) return;

        node.right=leftNode.right;
        leftNode.right=id;

        if(node.right){
            this.nodes.get(node.right).left=id;
        }
    }

    delete(targetId){
        const node = this.nodes.get(targetId);
        if(node) node.deleted = true;
    }

    toString(){
        let result = "";
        let current = this.head;

        while(current){
            const node = this.nodes.get(current);
            if(!node.deleted) result +=node.char;
            current = node.right;
        }

        return result;
    }
}
