def read_text_file(fname):
    with open (fname, "r") as myfile:
        data=myfile.read().replace('\n', '')
    return data;
    
def write_text_file(fname,text):
    with open (fname, "w") as myfile:
        myfile.write(text);

def string_to_intlist(str):
    list=str.split(',')
    for j in range(len(list)):
        list[j]=int(list[j])
    return list
    
def string_to_floatlist(str):
    list=str.split(',')
    for j in range(len(list)):
        list[j]=float(list[j])
    return list